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
  const [isCongestionBannerDismissed, setIsCongestionBannerDismissed] = React.useState(false);

  const banksWithStaleOracles = React.useMemo(
    () => extendedBankInfos.filter((bank) => isBankOracleStale(bank)),
    [extendedBankInfos]
  );

  React.useEffect(() => {
    const thresholdMet = banksWithStaleOracles.length >= CONGESTION_THRESHOLD;

    if ((thresholdMet && isOraclesStale) || isCongestionBannerDismissed) return;
    setIsOraclesStale(thresholdMet);
  }, [banksWithStaleOracles]);

  if (!isOraclesStale || isCongestionBannerDismissed) return null;

  return (
    <Link
      href="https://forum.marginfi.community/t/work-were-doing-to-improve-oracle-robustness-during-chain-congestion/283"
      target="_blank"
      rel="noreferrer"
      className="group fixed top-0 w-full h-14 p-4 pr-16 z-50 flex items-center justify-center leading-tight bg-background-gray-light text-xs font-normal text-muted-foreground md:text-sm md:h-10"
    >
      <div>
        <IconAlertTriangle size={16} className="inline mr-1.5 -translate-y-[1px]" />
        <p className="inline">
          Solana network congestion may be preventing oracles from updating price data.{" "}
          <span className="border-b border-primary/40 transition-colors group-hover:border-transparent">
            Learn more about marginfi's decentralized oracle strategy
          </span>
          .
        </p>
      </div>
      <Button
        variant="ghost"
        className="absolute top-1 right-2 h-auto p-2"
        onClick={(e) => {
          e.preventDefault();
          setIsOraclesStale(false);
          setIsCongestionBannerDismissed(true);
        }}
      >
        <IconX size={16} />
      </Button>
    </Link>
  );
};
