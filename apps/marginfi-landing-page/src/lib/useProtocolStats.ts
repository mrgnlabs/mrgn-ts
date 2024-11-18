"use client";

import React from "react";

import { Connection, PublicKey } from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";
import { MarginfiClient, getConfig, Bank, OraclePrice, getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
import { loadBankMetadatas, nativeToUi } from "@mrgnlabs/mrgn-common";
import { generateEndpoint } from "~/rpc.utils";

type UseProtocolStats = {
  stats: Stats;
  liquidity: number;
  deposits: number;
  borrows: number;
};

type Stat = {
  label: string;
  value: number;
};

type Stats = [Stat, Stat, Stat] | [];

const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const STAKE_POOL_ID = new PublicKey("DqhH94PjkZsjAqEze2BEkWhFQJ6EyU6MdtMphMgnXqeK");

export const useProtocolStats = (): UseProtocolStats => {
  const [stats, setStats] = React.useState<Stats>([]);
  const [liquidity, setLiquidity] = React.useState<number>(0);
  const [deposits, setDeposits] = React.useState<number>(0);
  const [borrows, setBorrows] = React.useState<number>(0);
  const [staked, setStaked] = React.useState<number>(0);

  React.useEffect(() => {
    const init = async () => {
      const rpcEndpoint = await generateEndpoint(
        process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE ?? "",
        process.env.NEXT_PUBLIC_RPC_PROXY_KEY ?? ""
      );
      const connection = new Connection(rpcEndpoint);
      const [bankMetadataMap] = await Promise.all([loadBankMetadatas()]);
      const bankAddresses = Object.keys(bankMetadataMap).map((address) => new PublicKey(address));

      const marginfiClient = await MarginfiClient.fetch(getConfig(), {} as any, connection, {
        preloadedBankAddresses: bankAddresses,
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

      const [stakePoolInfo] = await Promise.all([solanaStakePool.stakePoolInfo(connection, STAKE_POOL_ID)]);
      const solBank = banksWithPrice.find((bank) => bank.info.mint.equals(SOL_MINT));
      const totalStaked = Number(stakePoolInfo.totalLamports) / 1e9;
      const solPrice = solBank ? getPriceWithConfidence(solBank.oraclePrice, false).price.toNumber() : 0;
      const stakedValue = totalStaked * solPrice;
      const liquidity = deposits + stakedValue;

      const stats: Stats = [
        { label: "Total Liquidity", value: liquidity },
        { label: "Total Staked", value: stakedValue },
        { label: "Total Borrows", value: borrows },
      ];

      setStats(stats);
      setLiquidity(liquidity);
      setDeposits(deposits);
      setBorrows(borrows);
      setStaked(stakedValue);
    };

    init();
  }, []);

  return { stats, liquidity, deposits, borrows };
};
