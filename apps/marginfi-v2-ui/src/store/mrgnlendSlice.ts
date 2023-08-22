import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { StateCreator } from "zustand";
import { DEFAULT_ACCOUNT_SUMMARY, buildEmissionsPriceMap, fetchTokenAccounts, makeExtendedBankInfo } from "~/api";
import config from "~/config";
import { AccountSummary, BankMetadataMap, ExtendedBankInfo, TokenAccountMap, TokenMetadataMap } from "~/types";
import { findMetadataInsensitive, loadBankMetadatas, loadTokenMetadatas } from "~/utils";

interface MrgnlendSlice {
  initialized: boolean;
  marginfiClient: MarginfiClient | null;
  bankMetadataMap: BankMetadataMap;
  tokenMetadataMap: TokenMetadataMap;
  extendedBankInfos: ExtendedBankInfo[];
  marginfiAccountCount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  nativeSolBalance: number;
  accountSummary: AccountSummary;
  // initializeMrgnlendState: (connection: Connection) => Promise<void>;
  reloadMrgnlendState: (connection: Connection, anchorWallet?: AnchorWallet) => Promise<void>;
}

const createMrgnlendSlice: StateCreator<MrgnlendSlice, [], [], MrgnlendSlice> = (set) => ({
  initialized: false,
  marginfiClient: null,
  bankMetadataMap: {},
  tokenMetadataMap: {},
  extendedBankInfos: [],
  marginfiAccountCount: 0,
  selectedAccount: null,
  nativeSolBalance: 0,
  accountSummary: DEFAULT_ACCOUNT_SUMMARY,
  // initializeMrgnlendState: async (connection: Connection) => {
  //   const [marginfiClient, bankMetadataMap, tokenMetadataMap] = await Promise.all([
  //     MarginfiClient.fetch(config.mfiConfig, {} as any, connection),
  //     loadBankMetadatas(),
  //     loadTokenMetadatas(),
  //   ]);
  //   const banks = [...marginfiClient.banks.values()];

  //   const priceMap = await buildEmissionsPriceMap(banks, connection);

  //   const extendedBankInfos = banks.map((bank) => {
  //     const bankMetadata = bankMetadataMap[bank.address.toBase58()];
  //     if (bankMetadata === undefined) throw new Error(`Bank metadata not found for ${bank.address.toBase58()}`);

  //     const tokenMetadata = findMetadataInsensitive(tokenMetadataMap, bankMetadata.tokenSymbol);
  //     if (!tokenMetadata) throw new Error(`Token metadata not found for ${bankMetadata.tokenSymbol}`);

  //     const oraclePrice = marginfiClient.getOraclePriceByBank(bank.address);
  //     if (!oraclePrice) throw new Error(`Price info not found for bank ${bank.address.toBase58()}`);

  //     const emissionTokenPriceData = priceMap[bank.emissionsMint.toBase58()];

  //     return makeExtendedBankInfo(bank, oraclePrice, tokenMetadata, bankMetadata.tokenSymbol, emissionTokenPriceData);
  //   });

  //   set(() => ({ marginfiClient, bankMetadataMap, tokenMetadataMap, extendedBankInfos, initialized: true }));
  // },
  reloadMrgnlendState: async (connection: Connection, anchorWallet?: AnchorWallet) => {
    console.log("called", {connection: !!connection, anchorWallet: !!anchorWallet})
    const walletAddress = anchorWallet?.publicKey;

    const [marginfiClient, bankMetadataMap, tokenMetadataMap] = await Promise.all([
      MarginfiClient.fetch(config.mfiConfig, anchorWallet ?? ({} as any), connection),
      loadBankMetadatas(),
      loadTokenMetadatas(),
    ]);
    const banks = [...marginfiClient.banks.values()];

    const priceMap = await buildEmissionsPriceMap(banks, connection);

    let nativeSolBalance: number;
    let tokenAccountMap: TokenAccountMap;
    let marginfiAccounts: MarginfiAccountWrapper[];
    let selectedAccount: MarginfiAccountWrapper;
    if (walletAddress) {
      const [tokenData, marginfiAccountWrappers] = await Promise.all([
        fetchTokenAccounts(
          connection,
          anchorWallet.publicKey,
          banks.map((bank) => ({ mint: bank.mint, mintDecimals: bank.mintDecimals }))
        ),
        marginfiClient.getMarginfiAccountsForAuthority(walletAddress),
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
      if (walletAddress) {
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

    set({ marginfiClient, bankMetadataMap, tokenMetadataMap, extendedBankInfos, initialized: true });
  },
});

export { createMrgnlendSlice };
export type { MrgnlendSlice };
