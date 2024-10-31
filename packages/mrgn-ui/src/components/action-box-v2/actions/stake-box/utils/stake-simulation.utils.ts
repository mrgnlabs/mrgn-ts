import { Wallet } from "@coral-xyz/anchor";
import {
  MarginfiClient,
  Bank,
  MarginfiAccountWrapper,
  SimulationResult,
  makeBundleTipIx,
} from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  LST_MINT,
  TransactionBroadcastType,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  uiToNative,
} from "@mrgnlabs/mrgn-common";
import { ActionMessageType, handleSimulationError, LstData } from "@mrgnlabs/mrgn-utils";
import {
  AddressLookupTableAccount,
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ActionPreview,
  ActionSummary,
  calculateSimulatedActionPreview,
  SimulatedActionPreview,
} from "~/components/action-box-v2/utils";
import * as solanaStakePool from "@solana/spl-stake-pool";
import { QuoteResponse } from "@jup-ag/api";

export interface SimulateActionProps {
  marginfiClient: MarginfiClient;
  txns: (VersionedTransaction | Transaction)[];
  selectedBank: ExtendedBankInfo;
}

export interface CalculatePreviewProps {
  simulationResult?: SimulationResult;
  bank: ExtendedBankInfo;
  accountSummary: AccountSummary;
  actionTxns: any;
}

export function calculateSummary({
  simulationResult,
  bank,
  accountSummary,
  actionTxns,
}: CalculatePreviewProps): ActionSummary {
  let simulationPreview: SimulatedActionPreview | null = null;

  if (simulationResult) {
    simulationPreview = calculateSimulatedActionPreview(simulationResult, bank);
  }

  const actionPreview = calculateActionPreview(bank, accountSummary, actionTxns);

  return {
    actionPreview,
    simulationPreview,
  } as ActionSummary;
}

/*
outputamount, slippage, priceimpact
*/
function calculateActionPreview(
  bank: ExtendedBankInfo,
  accountSummary: AccountSummary,
  actionTxns: (Transaction | VersionedTransaction)[]
): ActionPreview {
  const positionAmount = bank?.isActive ? bank.position.amount : 0;

  const priceImpactPct = 0;
  const slippageBps = 0;

  return {
    positionAmount,
    priceImpactPct,
    slippageBps,
  } as ActionPreview;
}

export const getSimulationResult = async ({ marginfiClient, txns, selectedBank }: SimulateActionProps) => {
  const ataLst = getAssociatedTokenAddressSync(LST_MINT, marginfiClient.wallet.publicKey);
  let actionMethod: ActionMessageType | undefined = undefined;
  let simulationSucceeded = false;

  try {
    const [lstAta] = await marginfiClient.simulateTransactions(txns, [ataLst]); // can we detect lst balance difference?
    if (!lstAta) throw new Error("Failed to simulate stake transaction");

    simulationSucceeded = true;
  } catch (error) {
    actionMethod = handleSimulationError(error, selectedBank, false, "stake");
  }

  return { simulationSucceeded, actionMethod };
};

export const getAdressLookupTableAccounts = async (
  connection: Connection,
  keys: string[]
): Promise<AddressLookupTableAccount[]> => {
  const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
    keys.map((key) => new PublicKey(key))
  );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, new Array<AddressLookupTableAccount>());
};

export async function handleStakeTx(
  blockhash: string,
  amount: number,
  swapQuote: QuoteResponse | null,
  swapTx: VersionedTransaction | null,
  selectedBank: ExtendedBankInfo,
  marginfiClient: MarginfiClient,
  connection: Connection,
  lstData: LstData,
  priorityFee: number,
  broadcastType: TransactionBroadcastType
) {
  const stakeAmount = swapQuote
    ? Number(swapQuote.outAmount)
    : uiToNative(amount, selectedBank.info.state.mintDecimals).toNumber();

  const userSolTransfer = new Keypair();
  const signers: Signer[] = [userSolTransfer];
  const stakeIxs: TransactionInstruction[] = [];

  stakeIxs.push(
    SystemProgram.transfer({
      fromPubkey: marginfiClient.wallet.publicKey,
      toPubkey: userSolTransfer.publicKey,
      lamports: stakeAmount,
    })
  );

  const destinationTokenAccount = getAssociatedTokenAddressSync(
    lstData.accountData.poolMint,
    marginfiClient.wallet.publicKey,
    true
  );
  const ataData = await connection.getAccountInfo(destinationTokenAccount);

  if (!ataData) {
    stakeIxs.push(
      createAssociatedTokenAccountIdempotentInstruction(
        marginfiClient.wallet.publicKey,
        destinationTokenAccount,
        marginfiClient.wallet.publicKey,
        lstData.accountData.poolMint
      )
    );
  }

  const [withdrawAuthority] = PublicKey.findProgramAddressSync(
    [lstData.poolAddress.toBuffer(), Buffer.from("withdraw")],
    solanaStakePool.STAKE_POOL_PROGRAM_ID
  );

  stakeIxs.push(
    solanaStakePool.StakePoolInstruction.depositSol({
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

  const bundleTipIx = makeBundleTipIx(marginfiClient.wallet.publicKey, priorityFee);

  const stakeMessage = new TransactionMessage({
    payerKey: marginfiClient.wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: [bundleTipIx, ...stakeIxs],
  });

  const stakeTx = new VersionedTransaction(stakeMessage.compileToV0Message([]));
  stakeTx.sign(signers);

  return {
    actionTxn: stakeTx,
    actionQuote: swapQuote,
    additionalTxns: swapTx ? [swapTx] : [],
  };
}
