import { PublicKey, SolanaJSONRPCError, VersionedTransaction } from "@solana/web3.js";

import {
  MarginfiAccountWrapper,
  MarginfiClient,
  ProcessTransactionError,
  ProcessTransactionOpts,
} from "@mrgnlabs/marginfi-client-v2";
import { extractErrorString, captureSentryException, composeExplorerUrl } from "@mrgnlabs/mrgn-utils";
import {
  AccountLayout,
  ExtendedV0Transaction,
  getAssociatedTokenAddressSync,
  SolanaTransaction,
  TOKEN_PROGRAM_ID,
} from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { toastManager } from "@mrgnlabs/mrgn-toasts";

/**
 * Generates a transaction for withdrawing emissions from the specified banks.
 * TODO: This function should not return a transaction with empty instructions.
 */
export const generateWithdrawEmissionsTxn = async (
  banksWithEmissions: ExtendedBankInfo[],
  selectedAccount: MarginfiAccountWrapper
): Promise<ExtendedV0Transaction | undefined> => {
  try {
    const bankAddressesWithEmissions = banksWithEmissions.map((bank) => bank.meta.address);
    const tx = await selectedAccount.makeWithdrawEmissionsTx(bankAddressesWithEmissions);

    return tx;
  } catch (error) {
    console.error("Error generating emissions transaction", error);
  }
};

export const fetchBeforeStateEmissions = async (
  marginfiClient: MarginfiClient,
  banksWithEmissions: ActiveBankInfo[]
): Promise<{
  atas: PublicKey[];
  beforeAmounts: Map<PublicKey, { amount: number; tokenSymbol: string; mintDecimals: number }>;
}> => {
  const atas: PublicKey[] = [];
  const beforeAmounts = new Map<PublicKey, { amount: number; tokenSymbol: string; mintDecimals: number }>();

  for (let bank of banksWithEmissions) {
    if (!bank) {
      throw new Error("Bank is undefined");
    }

    const tokenMint = bank.info.rawBank.emissionsMint;
    const tokenSymbol = bank.info.rawBank.tokenSymbol ?? "";
    const mintDecimals = bank.info.rawBank.mintDecimals;

    const emissionTokenProgram = marginfiClient.mintDatas.get(bank.address.toString())?.emissionTokenProgram || null;
    const balance = bank.userInfo.tokenAccount.balance;

    const programId = emissionTokenProgram ?? TOKEN_PROGRAM_ID;

    if (!emissionTokenProgram) {
      console.error("Emission token program not found for bank", bank.meta.address.toBase58());
    }

    const ata = getAssociatedTokenAddressSync(tokenMint, marginfiClient.wallet.publicKey, true, programId);
    atas.push(ata);
    let beforeAmount = balance;

    beforeAmounts.set(bank.meta.address, { amount: beforeAmount, tokenSymbol, mintDecimals });
  }

  return { atas, beforeAmounts };
};

export const fetchAfterStateEmissions = (
  previewAtas: (Buffer | null)[],
  banksWithEmissions: ActiveBankInfo[],
  beforeAmounts: Map<PublicKey, { amount: number; tokenSymbol: string; mintDecimals: number }>
): Map<PublicKey, { amount: number; tokenSymbol: string; mintDecimals: number }> => {
  const afterAmounts = new Map<PublicKey, { amount: number; tokenSymbol: string; mintDecimals: number }>();
  previewAtas.forEach((ata, index) => {
    if (!ata) {
      return;
    }

    // TODO verify this is works
    const afterAmount = Number(AccountLayout.decode(ata as any).amount);
    const bankAddress = banksWithEmissions[index].meta.address;
    const beforeData = beforeAmounts.get(bankAddress);

    if (beforeData) {
      afterAmounts.set(bankAddress, {
        amount: afterAmount,
        tokenSymbol: beforeData.tokenSymbol,
        mintDecimals: beforeData.mintDecimals,
      });
    }
  });

  return afterAmounts;
};
