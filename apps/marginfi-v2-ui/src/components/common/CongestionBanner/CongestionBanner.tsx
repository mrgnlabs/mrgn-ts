import React from "react";

import Link from "next/link";

import { useMrgnlendStore, useUiStore } from "~/store";

import { IconAlertTriangle, IconX } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { isBankOracleStale } from "~/utils";

export const CONGESTION_THRESHOLD = 5;

export const CongestionBanner = () => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const [isOraclesStale, setIsOraclesStale] = useUiStore((state) => [state.isOraclesStale, state.setIsOraclesStale]);

  const banksWithStaleOracles = React.useMemo(
    () => extendedBankInfos.filter((bank) => isBankOracleStale(bank)),
    [extendedBankInfos]
  );

  React.useEffect(() => {
    const thresholdMet = banksWithStaleOracles.length >= CONGESTION_THRESHOLD;

    if (thresholdMet && isOraclesStale) return;
    setIsOraclesStale(thresholdMet);
  }, [banksWithStaleOracles]);

  if (!isOraclesStale) return null;

  return (
    <Link
      href=""
      target="_blank"
      rel="noreferrer"
      className="group fixed top-0 w-full h-10 z-50 leading-tight bg-background-gray-light text-sm font-normal flex items-center gap-1 justify-center text-muted-foreground"
    >
      <IconAlertTriangle size={16} />
      <p>
        Solana network congestion may be preventing oracles from updating price data.{" "}
        <span className="border-b border-primary/40 transition-colors group-hover:border-transparent">
          Learn more about marginfi's decentralized oracle strategy
        </span>
        .
      </p>
      <Button variant="ghost" className="absolute top-0.5 right-0">
        <IconX size={16} />
      </Button>
    </Link>
  );
};
