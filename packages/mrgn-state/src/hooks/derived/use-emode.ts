import React from "react";

import { Bank, MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";

import { getEmodePairs } from "../../lib";
import { useMarginfiAccount, useRawBanks } from "../react-query";

export function useEmode(user: PublicKey | undefined) {
  const { data: rawBanks, isLoading: isLoadingRawBanks, isError: isErrorRawBanks } = useRawBanks();
  const {
    data: marginfiAccount,
    isLoading: isLoadingMarginfiAccount,
    isError: isErrorMarginfiAccount,
  } = useMarginfiAccount(user);

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

  const emodeImpacts = React.useMemo(() => {
    return marginfiAccountClass && rawBanks
      ? marginfiAccountClass.computeEmodeImpacts(
          emodePairs,
          rawBanks.map((bank) => bank.address)
        )
      : {};
  }, [marginfiAccountClass, emodePairs, rawBanks]);

  return {
    activeEmodePairs,
    emodePairs,
    emodeImpacts,
    isLoading: isLoadingRawBanks || isLoadingMarginfiAccount,
    isError: isErrorRawBanks || isErrorMarginfiAccount,
  };
}
