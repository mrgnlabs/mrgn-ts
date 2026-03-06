import React from "react";

import { Bank, MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";

import { getEmodePairs } from "../../lib";
import { useMarginfiAccount, useRawBanks } from "../react-query";

// Module-level cache: parse banks once, reuse across all component instances
let _cachedRawBanksRef: any = null;
let _cachedParsedBanks: Bank[] | null = null;

function getParsedBanks(rawBanks: any[]): Bank[] {
  if (_cachedRawBanksRef === rawBanks && _cachedParsedBanks) {
    return _cachedParsedBanks;
  }
  _cachedParsedBanks = rawBanks.map((bank) => Bank.fromAccountParsed(bank.address, bank.data));
  _cachedRawBanksRef = rawBanks;
  return _cachedParsedBanks;
}

export function useEmode() {
  const { data: rawBanks, isLoading: isLoadingRawBanks, isError: isErrorRawBanks } = useRawBanks();
  const {
    data: marginfiAccount,
    isLoading: isLoadingMarginfiAccount,
    isError: isErrorMarginfiAccount,
  } = useMarginfiAccount();

  const parsedBanks = React.useMemo(() => {
    return rawBanks ? getParsedBanks(rawBanks) : undefined;
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

  // Defer computeEmodeImpacts to avoid blocking initial render.
  // It runs O(banks × emodePairs × 4 simulations) and is only needed for
  // emode weight overrides on maxBorrow calculations.
  const [emodeImpacts, setEmodeImpacts] = React.useState<Record<string, any>>({});
  React.useEffect(() => {
    if (marginfiAccountClass && rawBanks) {
      // Use requestIdleCallback (or setTimeout fallback) to defer heavy computation
      const id = (window.requestIdleCallback || ((cb: Function) => setTimeout(cb, 0)))(() => {
        const impacts = marginfiAccountClass.computeEmodeImpacts(
          emodePairs,
          rawBanks.map((bank) => bank.address)
        );
        setEmodeImpacts(impacts);
      });
      return () => {
        (window.cancelIdleCallback || clearTimeout)(id);
      };
    } else {
      setEmodeImpacts({});
    }
  }, [marginfiAccountClass, emodePairs, rawBanks]);

  return {
    activeEmodePairs,
    emodePairs,
    emodeImpacts,
    isLoading: isLoadingRawBanks || isLoadingMarginfiAccount,
    isError: isErrorRawBanks || isErrorMarginfiAccount,
  };
}
