import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { Wallet, nativeToUi } from "@mrgnlabs/mrgn-common";
import { Connection } from "@solana/web3.js";
import { StateCreator } from "zustand";
import {
  DEFAULT_ACCOUNT_SUMMARY,
  buildEmissionsPriceMap,
  computeAccountSummary,
  fetchTokenAccounts,
  makeExtendedBankInfo,
} from "~/api";
import { getPointsSummary } from "~/api/points";
import config from "~/config";
import { AccountSummary, BankMetadataMap, ExtendedBankInfo, TokenAccountMap, TokenMetadataMap } from "~/types";
import { findMetadataInsensitive, loadBankMetadatas, loadTokenMetadatas } from "~/utils";

interface ProtocolStats {
  deposits: number;
  borrows: number;
  tvl: number;
  pointsTotal: number;
}

interface MrgnlendSlice {
  // State
  marginfiClient: MarginfiClient | null;
  bankMetadataMap: BankMetadataMap;
  tokenMetadataMap: TokenMetadataMap;
  extendedBankInfos: ExtendedBankInfo[];
  protocolStats: ProtocolStats;
  marginfiAccountCount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  nativeSolBalance: number;
  accountSummary: AccountSummary;

  // Actions
  reloadMrgnlendState: (args?: { connection?: Connection; wallet?: Wallet; isOverride?: boolean }) => Promise<void>;
}

const createMrgnlendSlice: StateCreator<MrgnlendSlice, [], [], MrgnlendSlice> = (set, get) => ({
  // State
  marginfiClient: null,
  bankMetadataMap: {},
  tokenMetadataMap: {},
  extendedBankInfos: [],
  protocolStats: {
    deposits: 0,
    borrows: 0,
    tvl: 0,
    pointsTotal: 0,
  },
  marginfiAccountCount: 0,
  selectedAccount: null,
  nativeSolBalance: 0,
  accountSummary: DEFAULT_ACCOUNT_SUMMARY,

  // Actions
  reloadMrgnlendState: async (args?: { connection?: Connection; wallet?: Wallet; isOverride?: boolean }) => {
    console.log("called", { connection: !!args?.connection, anchorWallet: !!args?.wallet });

    const connection = args?.connection ?? get().marginfiClient?.provider.connection;
    if (!connection) throw new Error("Connection not found");

    const wallet = args?.wallet ?? get().marginfiClient?.provider?.wallet;

    const isReadOnly = args?.isOverride !== undefined ? args.isOverride : get().marginfiClient?.isReadOnly ?? false;
    const [marginfiClient, bankMetadataMap, tokenMetadataMap] = await Promise.all([
         MarginfiClient.fetch(config.mfiConfig, wallet ?? ({} as any), connection, undefined, isReadOnly),
      loadBankMetadatas(),
      loadTokenMetadatas(),
    ]);
    const banks = [...marginfiClient.banks.values()];

    const priceMap = await buildEmissionsPriceMap(banks, connection);

    let nativeSolBalance: number = 0;
    let tokenAccountMap: TokenAccountMap;
    let marginfiAccounts: MarginfiAccountWrapper[] = [];
    let selectedAccount: MarginfiAccountWrapper | null = null;
    if (wallet) {
      const [tokenData, marginfiAccountWrappers] = await Promise.all([
        fetchTokenAccounts(
          connection,
          wallet.publicKey,
          banks.map((bank) => ({ mint: bank.mint, mintDecimals: bank.mintDecimals }))
        ),
        marginfiClient.getMarginfiAccountsForAuthority(wallet.publicKey),
      ]);

      nativeSolBalance = tokenData.nativeSolBalance;
      tokenAccountMap = tokenData.tokenAccountMap;
      marginfiAccounts = marginfiAccountWrappers;
      selectedAccount = marginfiAccounts[0];
    }

    const extendedBankInfos = banks.map((bank) => {
      const bankMetadata = bankMetadataMap[bank.address.toBase58()];
      if (bankMetadata === undefined) throw new Error(`Bank metadata not found for ${bank.address.toBase58()}`);

      const tokenMetadata = findMetadataInsensitive(tokenMetadataMap, bankMetadata.tokenSymbol);
      if (!tokenMetadata) throw new Error(`Token metadata not found for ${bankMetadata.tokenSymbol}`);

      const oraclePrice = marginfiClient.getOraclePriceByBank(bank.address);
      if (!oraclePrice) throw new Error(`Price info not found for bank ${bank.address.toBase58()}`);

      const emissionTokenPriceData = priceMap[bank.emissionsMint.toBase58()];

      let userData;
      if (wallet) {
        const tokenAccount = tokenAccountMap!.get(bank.mint.toBase58());
        if (!tokenAccount) throw new Error(`Token account not found for ${bank.mint.toBase58()}`);
        userData = {
          nativeSolBalance: nativeSolBalance!,
          tokenAccount,
          marginfiAccount: selectedAccount!,
        };
      }

      return makeExtendedBankInfo(
        bank,
        oraclePrice,
        tokenMetadata,
        bankMetadata.tokenSymbol,
        emissionTokenPriceData,
        userData
      );
    });

    const { deposits, borrows } = extendedBankInfos.reduce(
      (acc, bankInfo) => {
        acc.deposits += nativeToUi(
          bankInfo.bank.getTotalAssetQuantity().times(bankInfo.oraclePrice.price),
          bankInfo.tokenMintDecimals
        );
        acc.borrows += nativeToUi(
          bankInfo.bank.getTotalLiabilityQuantity().times(bankInfo.oraclePrice.price),
          bankInfo.tokenMintDecimals
        );
        return acc;
      },
      { deposits: 0, borrows: 0 }
    );

    let accountSummary: AccountSummary = DEFAULT_ACCOUNT_SUMMARY;
    if (wallet) {
      accountSummary = computeAccountSummary(selectedAccount!, extendedBankInfos);
    }

    const pointSummary = await getPointsSummary();

    set({
      marginfiClient,
      bankMetadataMap,
      tokenMetadataMap,
      extendedBankInfos,
      protocolStats: {
        deposits,
        borrows,
        tvl: deposits - borrows,
        pointsTotal: pointSummary.points_total,
      },
      marginfiAccountCount: marginfiAccounts.length,
      selectedAccount,
      nativeSolBalance,
      accountSummary,
    });
  },
});

export { createMrgnlendSlice };
export type { MrgnlendSlice };
