// this holds all the logic to create the stake transactions

import { createJupiterApiClient, QuoteResponse } from "@jup-ag/api";
import * as SplStakePool from "@solana/spl-stake-pool";
import { makeUnwrapSolIx } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  uiToNative,
  LST_MINT,
  LUT_PROGRAM_AUTHORITY_INDEX,
  NATIVE_MINT,
  addTransactionMetadata,
  SolanaTransaction,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@mrgnlabs/mrgn-common";
import {
  getSwapQuoteWithRetry,
  STATIC_SIMULATION_ERRORS,
  deserializeInstruction,
  getAdressLookupTableAccounts,
  ActionMessageType,
  LstData,
  StakeActionTxns,
} from "@mrgnlabs/mrgn-utils";
import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

type CreateUnstakeLstTxProps = {
  amount: number;
  feepayer: PublicKey;
  connection: Connection;
  blockhash?: string;
  jupOpts: {
    platformFeeBps: number;
    slippageBps: number;
  };
};

// unstaking LST (essentially a swap)
export async function createUnstakeLstTx({
  amount,
  feepayer,
  connection,
  blockhash,
  jupOpts,
}: CreateUnstakeLstTxProps): Promise<StakeActionTxns | ActionMessageType> {
  const swapResponse = await createSwapToSolTx({
    feepayer,
    connection,
    blockhash,
    inputMintOpts: {
      mint: LST_MINT,
      amount,
      mintDecimals: 9,
    },
    jupOpts,
  });

  if (swapResponse.error || !swapResponse.tx || !swapResponse.quote) {
    return swapResponse.error ?? STATIC_SIMULATION_ERRORS.STAKE_SWAP_SIMULATION_FAILED;
  }

  return {
    actionTxn: swapResponse.tx,
    additionalTxns: [],
    actionQuote: swapResponse.quote,
  } as StakeActionTxns;
}

type CreateStakeLstTxProps = {
  amount: number;
  selectedBank: ExtendedBankInfo;
  feepayer: PublicKey;
  connection: Connection;
  lstData: LstData;
  blockhash?: string;
  jupOpts: {
    platformFeeBps: number;
    slippageBps: number;
  };
};

export async function createStakeLstTx({
  amount,
  selectedBank,
  feepayer,
  connection,
  blockhash,
  lstData,
  jupOpts,
}: CreateStakeLstTxProps): Promise<StakeActionTxns | ActionMessageType> {
  let swapQuote: QuoteResponse | null = null;
  let swapTx: SolanaTransaction | null = null;

  const finalBlockhash = blockhash || (await connection.getLatestBlockhash()).blockhash;

  if (selectedBank.info.state.mint.toBase58() !== NATIVE_MINT.toBase58()) {
    const swapResponse = await createSwapToSolTx({
      feepayer,
      connection,
      blockhash: finalBlockhash,
      inputMintOpts: {
        mint: selectedBank.info.state.mint,
        amount,
        mintDecimals: selectedBank.info.state.mintDecimals,
      },
      jupOpts,
    });

    if (swapResponse.error || !swapResponse.tx || !swapResponse.quote) {
      return swapResponse.error ?? STATIC_SIMULATION_ERRORS.STAKE_SWAP_SIMULATION_FAILED;
    }

    swapQuote = swapResponse.quote;
    swapTx = swapResponse.tx;
  }

  const stakeAmount = swapQuote
    ? Number(swapQuote.outAmount)
    : uiToNative(amount, selectedBank.info.state.mintDecimals).toNumber();

  const userSolTransfer = new Keypair();
  const signers: Signer[] = [userSolTransfer];
  const stakeIxs: TransactionInstruction[] = [];

  stakeIxs.push(
    SystemProgram.transfer({
      fromPubkey: feepayer,
      toPubkey: userSolTransfer.publicKey,
      lamports: stakeAmount,
    })
  );

  const destinationTokenAccount = getAssociatedTokenAddressSync(lstData.accountData.poolMint, feepayer, true);
  const ataData = await connection.getAccountInfo(destinationTokenAccount);

  if (!ataData) {
    stakeIxs.push(
      createAssociatedTokenAccountIdempotentInstruction(
        feepayer,
        destinationTokenAccount,
        feepayer,
        lstData.accountData.poolMint
      )
    );
  }

  const [withdrawAuthority] = PublicKey.findProgramAddressSync(
    [lstData.poolAddress.toBuffer(), Buffer.from("withdraw")],
    SplStakePool.STAKE_POOL_PROGRAM_ID
  );

  stakeIxs.push(
    SplStakePool.StakePoolInstruction.depositSol({
      stakePool: lstData.poolAddress,
      reserveStake: lstData.accountData.reserveStake,
      fundingAccount: userSolTransfer.publicKey,
      destinationPoolAccount: destinationTokenAccount,
      managerFeeAccount: lstData.accountData.managerFeeAccount,
      referralPoolAccount: destinationTokenAccount,
      poolMint: lstData.accountData.poolMint,
      lamports: stakeAmount,
      withdrawAuthority,
    })
  );

  const stakeMessage = new TransactionMessage({
    payerKey: feepayer,
    recentBlockhash: finalBlockhash,
    instructions: [...stakeIxs],
  });

  const stakeTx = addTransactionMetadata(new VersionedTransaction(stakeMessage.compileToV0Message([])), {
    signers: signers,
  });

  return {
    actionTxn: stakeTx,
    additionalTxns: swapTx ? [swapTx] : [],
    actionQuote: swapQuote,
  } as StakeActionTxns;
}

type CreateSwapToSolTxProps = {
  feepayer: PublicKey;
  connection: Connection;
  blockhash?: string;
  inputMintOpts: {
    mint: PublicKey;
    amount: number;
    mintDecimals: number;
  };
  jupOpts: {
    platformFeeBps: number;
    slippageBps: number;
  };
};

export const createSwapToSolTx = async ({
  feepayer,
  connection,
  blockhash,
  inputMintOpts,
  jupOpts,
}: CreateSwapToSolTxProps): Promise<{ quote?: QuoteResponse; tx?: SolanaTransaction; error?: ActionMessageType }> => {
  const jupiterQuoteApi = createJupiterApiClient();

  const swapQuote = await getSwapQuoteWithRetry({
    amount: uiToNative(inputMintOpts.amount, inputMintOpts.mintDecimals).toNumber(),
    inputMint: inputMintOpts.mint.toBase58(),
    outputMint: NATIVE_MINT.toBase58(),
    platformFeeBps: jupOpts.platformFeeBps,
    slippageBps: jupOpts.slippageBps,
    swapMode: "ExactIn",
  });

  if (!swapQuote) {
    return { error: STATIC_SIMULATION_ERRORS.STAKE_SWAP_SIMULATION_FAILED };
  }

  const {
    computeBudgetInstructions,
    swapInstruction,
    setupInstructions,
    cleanupInstruction,
    addressLookupTableAddresses,
  } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: swapQuote,
      userPublicKey: feepayer.toBase58(),
      feeAccount: undefined,
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
    },
  });

  const swapIx = deserializeInstruction(swapInstruction);
  const setupInstructionsIxs = setupInstructions.map((value) => deserializeInstruction(value));
  const cleanupInstructionIx = deserializeInstruction(cleanupInstruction);
  const cuInstructionsIxs = computeBudgetInstructions.map((value) => deserializeInstruction(value));
  const addressLookupAccounts = await getAdressLookupTableAccounts(connection, addressLookupTableAddresses);
  const unwrapSolIx = makeUnwrapSolIx(feepayer);

  const finalBlockhash = blockhash || (await connection.getLatestBlockhash()).blockhash;

  const swapMessage = new TransactionMessage({
    payerKey: feepayer,
    recentBlockhash: finalBlockhash,
    instructions: [...cuInstructionsIxs, ...setupInstructionsIxs, swapIx, unwrapSolIx],
  });
  const swapTx = addTransactionMetadata(
    new VersionedTransaction(swapMessage.compileToV0Message(addressLookupAccounts)),
    {
      addressLookupTables: addressLookupAccounts,
    }
  );

  return { quote: swapQuote, tx: swapTx };
};
