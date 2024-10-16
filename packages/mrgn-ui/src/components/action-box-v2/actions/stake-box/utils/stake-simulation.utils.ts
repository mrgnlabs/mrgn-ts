import { Wallet } from "@coral-xyz/anchor";
import { MarginfiClient, Bank, MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { AddressLookupTableAccount, Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  ActionPreview,
  ActionSummary,
  calculateSimulatedActionPreview,
  SimulatedActionPreview,
} from "~/components/action-box-v2/utils";

export interface SimulateActionProps {
  marginfiClient: MarginfiClient;
  txns: (VersionedTransaction | Transaction)[];
  selectedBank: ExtendedBankInfo;
  selectedAccount: MarginfiAccountWrapper;
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

export const getSimulationResult = async ({
  marginfiClient,
  txns,
  selectedBank,
  selectedAccount,
}: SimulateActionProps) => {
  const [mfiAccountData, bankData] = await marginfiClient.simulateTransactions(txns, [
    marginfiClient.wallet.publicKey,
    selectedBank.address,
  ]);

  if (!mfiAccountData || !bankData) throw new Error("Failed to simulate stake transaction");

  const previewBanks = marginfiClient.banks;
  previewBanks.set(
    selectedBank.address.toBase58(),
    Bank.fromBuffer(selectedBank.address, bankData, marginfiClient.program.idl, marginfiClient.feedIdMap)
  );

  const previewClient = new MarginfiClient(
    marginfiClient.config,
    marginfiClient.program,
    {} as Wallet,
    true,
    marginfiClient.group,
    marginfiClient.banks,
    marginfiClient.oraclePrices,
    marginfiClient.mintDatas,
    marginfiClient.feedIdMap
  );

  const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
    selectedAccount.address,
    previewClient,
    mfiAccountData,
    marginfiClient.program.idl
  );

  const simulationResult = {
    banks: previewBanks,
    marginfiAccount: previewMarginfiAccount,
  } as SimulationResult;

  return { simulationResult }; // TODO: also return action method? Why
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
