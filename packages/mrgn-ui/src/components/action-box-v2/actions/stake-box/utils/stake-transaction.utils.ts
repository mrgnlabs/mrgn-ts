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
  TransactionType,
} from "@mrgnlabs/mrgn-common";
import {
  getSwapQuoteWithRetry,
  STATIC_SIMULATION_ERRORS,
  deserializeInstruction,
  getAdressLookupTableAccounts,
  ActionMessageType,
  LstData,
  StakeActionTxns,
  JupiterOptions,
} from "@mrgnlabs/mrgn-utils";
import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  StakeProgram,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { StakePoolInstruction } from "@solana/spl-stake-pool";

type CreateUnstakeLstTxProps = {
  destinationStakeAuthority: PublicKey;
  sourceTransferAuthority: PublicKey;
  amount: number;
  feepayer: PublicKey;
  connection: Connection;
  lstData: LstData;
  blockhash?: string;
};

export async function createUnstakeLstTx({
  destinationStakeAuthority,
  sourceTransferAuthority,
  amount,
  feepayer,
  connection,
  lstData,
  blockhash,
}: CreateUnstakeLstTxProps): Promise<StakeActionTxns | ActionMessageType> {
  const unstakeIxs: TransactionInstruction[] = [];

  // 1. get or create source pool account (LST token account)
  const sourcePoolAccount = getAssociatedTokenAddressSync(lstData.accountData.poolMint, feepayer, true);
  const ataData = await connection.getAccountInfo(sourcePoolAccount);

  if (!ataData) {
    unstakeIxs.push(
      createAssociatedTokenAccountIdempotentInstruction(
        feepayer,
        sourcePoolAccount,
        feepayer,
        lstData.accountData.poolMint
      )
    );
  }

  // 2. create destination stake account
  const destinationStakeKeypair = Keypair.generate();
  const destinationStake = destinationStakeKeypair.publicKey;
  const stakeAccountSpace = 200;

  const rentExemptionAmount = await connection.getMinimumBalanceForRentExemption(stakeAccountSpace);

  const createDestinationStakeAccountIx = SystemProgram.createAccount({
    fromPubkey: feepayer,
    newAccountPubkey: destinationStake,
    lamports: rentExemptionAmount,
    space: stakeAccountSpace,
    programId: StakeProgram.programId,
  });

  unstakeIxs.push(createDestinationStakeAccountIx);

  // 3. withdraw stake
  const stakePool = lstData.poolAddress;
  const [validatorList] = PublicKey.findProgramAddressSync(
    [stakePool.toBuffer(), Buffer.from("validator_list")],
    SplStakePool.STAKE_POOL_PROGRAM_ID
  );
  const [withdrawAuthority] = PublicKey.findProgramAddressSync(
    [lstData.poolAddress.toBuffer(), Buffer.from("withdraw")],
    SplStakePool.STAKE_POOL_PROGRAM_ID
  );
  const validatorStake = await findUsableValidatorStakeAccount(connection, stakePool, lstData.validatorListInfos);
  const managerFeeAccount = lstData.accountData.managerFeeAccount;
  const poolMint = lstData.accountData.poolMint;

  const finalBlockhash = blockhash || (await connection.getLatestBlockhash()).blockhash;

  if (!validatorStake) {
    return STATIC_SIMULATION_ERRORS.STAKE_SIMULATION_FAILED;
  }

  const unstakeIx = StakePoolInstruction.withdrawStake({
    stakePool,
    validatorList,
    withdrawAuthority,
    validatorStake,
    destinationStake,
    destinationStakeAuthority,
    sourceTransferAuthority,
    sourcePoolAccount,
    managerFeeAccount,
    poolMint,
    poolTokens: amount,
  });

  unstakeIxs.push(unstakeIx);

  // 4. finalize unstake transaction
  const unstakeMessage = new TransactionMessage({
    payerKey: feepayer,
    recentBlockhash: finalBlockhash,
    instructions: unstakeIxs,
  });

  const unstakeTx = addTransactionMetadata(new VersionedTransaction(unstakeMessage.compileToV0Message([])), {
    signers: [destinationStakeKeypair],
    type: TransactionType.UNSTAKE_LST,
  });

  return {
    transactions: [unstakeTx],
  } as StakeActionTxns;
}

type CreateInstantUnstakeLstTxProps = {
  amount: number;
  feepayer: PublicKey;
  connection: Connection;
  blockhash?: string;
  jupiterOptions: JupiterOptions | null;
  platformFeeBps: number;
};

// unstaking LST (essentially a swap)
export async function createInstantUnstakeLstTx({
  amount,
  feepayer,
  connection,
  blockhash,
  jupiterOptions,
  platformFeeBps,
}: CreateInstantUnstakeLstTxProps): Promise<StakeActionTxns | ActionMessageType> {
  const swapResponse = await createSwapToSolTx({
    feepayer,
    connection,
    blockhash,
    inputMintOpts: {
      mint: LST_MINT,
      amount,
      mintDecimals: 9,
    },
    jupiterOptions,
    platformFeeBps,
  });

  if (swapResponse.error || !swapResponse.tx || !swapResponse.quote) {
    return swapResponse.error ?? STATIC_SIMULATION_ERRORS.STAKE_SWAP_SIMULATION_FAILED;
  }

  return {
    transactions: [swapResponse.tx],
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
  jupiterOptions: JupiterOptions | null;
  platformFeeBps: number;
};

export async function createStakeLstTx({
  amount,
  selectedBank,
  feepayer,
  connection,
  blockhash,
  lstData,
  jupiterOptions,
  platformFeeBps,
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
      jupiterOptions,
      platformFeeBps,
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
    type: TransactionType.SOL_TO_LST,
  });

  return {
    transactions: swapTx ? [swapTx, stakeTx] : [stakeTx],
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
  jupiterOptions: JupiterOptions | null;
  platformFeeBps: number;
};

export const createSwapToSolTx = async ({
  feepayer,
  connection,
  blockhash,
  inputMintOpts,
  jupiterOptions,
  platformFeeBps,
}: CreateSwapToSolTxProps): Promise<{ quote?: QuoteResponse; tx?: SolanaTransaction; error?: ActionMessageType }> => {
  const jupiterQuoteApi = createJupiterApiClient();

  const swapQuote = await getSwapQuoteWithRetry({
    amount: uiToNative(inputMintOpts.amount, inputMintOpts.mintDecimals).toNumber(),
    inputMint: inputMintOpts.mint.toBase58(),
    outputMint: NATIVE_MINT.toBase58(),
    platformFeeBps: platformFeeBps,
    slippageBps: jupiterOptions?.slippageMode === "FIXED" ? jupiterOptions?.slippageBps : undefined,
    dynamicSlippage: jupiterOptions?.slippageMode === "DYNAMIC" ? true : false,
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
      type: TransactionType.SWAP_TO_SOL,
    }
  );

  return { quote: swapQuote, tx: swapTx };
};

async function findUsableValidatorStakeAccount(
  connection: Connection,
  stakePool: PublicKey,
  validatorList: { voteAccountAddress: string; activeStakeLamports: string }[],
  maxValidatorsToTry = 5
): Promise<PublicKey | null> {
  const sortedValidators = validatorList
    .filter((v) => Number(v.activeStakeLamports) > 0)
    .sort((a, b) => Number(b.activeStakeLamports) - Number(a.activeStakeLamports))
    .slice(0, maxValidatorsToTry);

  for (const validator of sortedValidators) {
    const voteAccount = new PublicKey(validator.voteAccountAddress);

    const [validatorStake] = PublicKey.findProgramAddressSync(
      [Buffer.from("validator_stake"), voteAccount.toBuffer(), stakePool.toBuffer()],
      SplStakePool.STAKE_POOL_PROGRAM_ID
    );

    try {
      const stakeAccountInfo = await connection.getParsedAccountInfo(validatorStake);
      const delegated = (stakeAccountInfo?.value?.data as any)?.parsed?.info?.stake?.delegation;

      if (Number(delegated?.stake ?? 0) > 0 && delegated?.voter === voteAccount.toBase58()) {
        return validatorStake;
      }
    } catch (_) {
      continue;
    }
  }

  return null;
}
