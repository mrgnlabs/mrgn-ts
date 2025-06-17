import React from "react";
import { getEmodePairs } from "../../lib";
import { useMarginfiAccount, useRawBanks } from "../react-query";
import { Bank, computeActiveEmodePairs, MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";

export function useEmode(user: PublicKey | undefined) {
  const { data: rawBanks } = useRawBanks();
  const { data: marginfiAccount } = useMarginfiAccount(user);

  const parsedBanks = React.useMemo(() => {
    return rawBanks?.map((bank) => Bank.fromAccountParsed(bank.address, bank.data));
  }, [rawBanks]);

  const emodePairs = React.useMemo(() => {
    return parsedBanks ? getEmodePairs(parsedBanks) : [];
  }, [parsedBanks]);

  const marginfiAccountClass = React.useMemo(() => {
    return marginfiAccount ? MarginfiAccount.fromAccountType(marginfiAccount) : undefined;
  }, [marginfiAccount]);

  const activeEmodePairs = React.useMemo(() => {
    return marginfiAccountClass ? marginfiAccountClass.computeActiveEmodePairs(emodePairs) : [];
  }, [marginfiAccountClass, emodePairs]);

  return {
    activeEmodePairs,
    emodePairs,
  };
}
