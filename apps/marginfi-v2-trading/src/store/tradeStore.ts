import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  ExtendedBankInfo,
  ExtendedBankMetadata,
  makeExtendedBankInfo,
  makeExtendedBankMetadata,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiClient, getConfig, BankMap, Bank, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import {
  Wallet,
  TokenMetadata,
  loadTokenMetadatas,
  loadBankMetadatas,
  getValueInsensitive,
} from "@mrgnlabs/mrgn-common";

type TradeGroupsCache = {
  [group: string]: [string, string];
};

type TradeStoreState = {
  initialized: boolean;

  // array of marginfi groups
  groups: PublicKey[];

  // array of extended bank objects (excluding USDC)
  banks: ExtendedBankInfo[];

  // marginfi client, initialized when viewing an active group
  marginfiClient: MarginfiClient | null;

  // active group, currently being viewed / traded
  activeGroup: {
    token: ExtendedBankInfo;
    usdc: ExtendedBankInfo;
  } | null;

  // fetch groups / banks
  fetchTradeState: ({ connection, wallet }: { connection: Connection; wallet: Wallet }) => void;

  // set active banks and initialize marginfi client
  setActiveBank: (bank: ExtendedBankInfo) => void;
};

const { programId } = getConfig();

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

function createTradeStore() {
  return create<TradeStoreState>()(
    persist(stateCreator, {
      name: "tradeStore",
    })
  );
}

const stateCreator: StateCreator<TradeStoreState, [], []> = (set, get) => ({
  initialized: false,
  groups: [],
  banks: [],
  marginfiClient: null,
  activeGroup: null,

  fetchTradeState: async ({ connection, wallet }) => {
    try {
      console.log("hi");
      // fetch groups
      const tradeGroups: TradeGroupsCache = await fetch(
        "https://storage.googleapis.com/mrgn-public/mfi-trade-groups.json"
      ).then((res) => res.json());

      if (!tradeGroups) {
        console.error("Failed to fetch trade groups");
        return;
      }

      const tokenMetadataMap = await loadTokenMetadatas(
        "https://storage.googleapis.com/mrgn-public/mfi-trade-metadata-cache.json"
      );

      const bankMetadataMap = await loadBankMetadatas(
        "https://storage.googleapis.com/mrgn-public/mfi-bank-metadata-cache.json"
      );

      const groups = Object.keys(tradeGroups).map((group) => new PublicKey(group));
      const banks: ExtendedBankInfo[] = [];

      console.log(groups);

      await Promise.all(
        groups.map(async (group) => {
          console.log("here11");
          const bankKeys = tradeGroups[group.toBase58()].map((bank) => new PublicKey(bank));
          const marginfiClient = await MarginfiClient.fetch(
            {
              environment: "production",
              cluster: "mainnet",
              programId,
              groupPk: group,
            },
            wallet,
            connection,
            {
              preloadedBankAddresses: bankKeys,
            }
          );
          console.log(Array.from(marginfiClient.banks.values()));
          const banksUSDCFiltered = Array.from(marginfiClient.banks.values()).filter(
            (bank) => bank.mint.equals(USDC_MINT) === false
          );

          const banksWithPriceAndToken: {
            bank: Bank;
            oraclePrice: OraclePrice;
            tokenMetadata: TokenMetadata;
          }[] = [];

          console.log(banksUSDCFiltered);

          banksUSDCFiltered.forEach((bank) => {
            console.log("bank", bank);
            const oraclePrice = marginfiClient.getOraclePriceByBank(bank.address);
            if (!oraclePrice) {
              return;
            }

            const bankMetadata = bankMetadataMap[bank.address.toBase58()];
            if (bankMetadata === undefined) {
              return;
            }

            try {
              const tokenMetadata = getValueInsensitive(tokenMetadataMap, bankMetadata.tokenSymbol);
              if (!tokenMetadata) {
                return;
              }

              console.log("hiii");
              banksWithPriceAndToken.push({ bank, oraclePrice, tokenMetadata });
            } catch (err) {
              console.error("error fetching token metadata: ", err);
            }
          });

          console.log("banksWithPriceAndToken", banksWithPriceAndToken);

          const [extendedBankInfos, extendedBankMetadatas] = banksWithPriceAndToken.reduce(
            (acc, { bank, oraclePrice, tokenMetadata }) => {
              acc[0].push(makeExtendedBankInfo(tokenMetadata, bank, oraclePrice));
              acc[1].push(makeExtendedBankMetadata(new PublicKey(bank.address), tokenMetadata));

              return acc;
            },
            [[], []] as [ExtendedBankInfo[], ExtendedBankMetadata[]]
          );

          console.log(extendedBankInfos);

          banks.push(...extendedBankInfos);

          console.log(banks);

          return;
        })
      );

      console.log(banks);

      set((state) => {
        return {
          ...state,
          initialized: true,
          groups,
          banks,
        };
      });
    } catch (error) {
      console.error(error);
    }
  },

  setActiveBank: (bank: ExtendedBankInfo) => {
    set((state) => {
      return {
        ...state,
        activeBank: bank,
      };
    });
  },
});

export { createTradeStore };
export type { TradeStoreState };
