"use client";

import React from "react";

import { Connection, PublicKey } from "@solana/web3.js";
import { MarginfiClient, getConfig, Bank, OraclePrice, getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
import { loadBankMetadatas, nativeToUi } from "@mrgnlabs/mrgn-common";

type Stat = {
  label: string;
  value: number;
};

type Stats = [Stat, Stat, Stat] | [];

export const useProtocolStats = (): Stats => {
  const [stats, setStats] = React.useState<Stats>([]);

  React.useEffect(() => {
    const init = async () => {
      const connection = new Connection(process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE!);
      const [bankMetadataMap] = await Promise.all([loadBankMetadatas()]);
      const bankAddresses = Object.keys(bankMetadataMap).map((address) => new PublicKey(address));

      const marginfiClient = await MarginfiClient.fetch(getConfig(), {} as any, connection, {
        preloadedBankAddresses: bankAddresses,
        sendEndpoint: process.env.NEXT_PUBLIC_MARGINFI_SEND_RPC_ENDPOINT_OVERRIDE,
      });

      const banks = [...marginfiClient.banks.values()];

      const banksWithPrice: {
        info: Bank;
        oraclePrice: OraclePrice;
      }[] = [];

      banks.forEach((bank) => {
        const oraclePrice = marginfiClient.getOraclePriceByBank(bank.address);
        if (!oraclePrice) {
          return;
        }

        const bankMetadata = bankMetadataMap[bank.address.toBase58()];
        if (bankMetadata === undefined) {
          return;
        }

        banksWithPrice.push({ info: bank, oraclePrice });
      });

      const { deposits, borrows } = banksWithPrice.reduce(
        (acc, bank) => {
          const price = getPriceWithConfidence(bank.oraclePrice, false).price.toNumber();
          const deposits = nativeToUi(bank.info.getTotalAssetQuantity(), bank.info.mintDecimals);
          const borrows = nativeToUi(bank.info.getTotalLiabilityQuantity(), bank.info.mintDecimals);
          acc.deposits += deposits * price;
          acc.borrows += borrows * price;
          return acc;
        },
        { deposits: 0, borrows: 0 }
      );

      const stats: Stats = [
        { label: "Total Deposits", value: deposits },
        { label: "Total Borrows", value: borrows },
        { label: "Total Value Locked", value: deposits - borrows },
      ];

      setStats(stats);
    };

    init();
  }, []);

  return stats;
};
