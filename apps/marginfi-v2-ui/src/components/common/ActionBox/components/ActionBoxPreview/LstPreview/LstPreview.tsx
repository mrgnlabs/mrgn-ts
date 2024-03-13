import React from "react";

import JSBI from "jsbi";
import { SwapMode, useJupiter } from "@jup-ag/react-hook";

import { getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
import { percentFormatter, numeralFormatter, percentFormatterDyn } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useLstStore, useMrgnlendStore } from "~/store";
import { LST_MINT, SOL_MINT } from "~/store/lstStore";
import { clampedNumeralFormatter, cn, StakeData } from "~/utils";
import { useDebounce } from "~/hooks/useDebounce";

import { Skeleton } from "~/components/ui/skeleton";

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  selectedStakingAccount: StakeData | null;
  isEnabled: boolean;
  amount: number;
  children: React.ReactNode;
}

export const LstPreview = ({
  selectedBank,
  selectedStakingAccount,
  isEnabled,
  amount,
  children,
}: ActionBoxPreviewProps) => {
  const [lstData, slippagePct, setQuoteResponseMeta] = useLstStore((state) => [
    state.lstData,
    state.slippagePct,
    state.setQuoteResponseMeta,
  ]);

  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const solUsdValue = React.useMemo(() => {
    const bank = extendedBankInfos.find((bank) => bank.info.state.mint.equals(SOL_MINT));
    return bank ? getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber() : 0;
  }, [extendedBankInfos]);

  const debouncedAmount = useDebounce<number | null>(amount, 500);
  const slippageBps = React.useMemo(() => slippagePct * 100, [slippagePct]);

  // TODO figure out refresh
  const {
    quoteResponseMeta,
    loading: loadingQuotes,
    refresh,
    lastRefreshTimestamp,
    error,
  } = useJupiter({
    amount: JSBI.BigInt(Math.trunc(Math.pow(10, selectedBank?.info.state.mintDecimals ?? 0) * (debouncedAmount ?? 0))), // amountIn trick to avoid Jupiter calls when depositing stake or native SOL Math.pow(10, selectedBank.) *
    inputMint: selectedBank?.info.state.mint,
    outputMint: LST_MINT,
    swapMode: SwapMode.ExactIn,
    slippageBps,
    debounceTime: 250,
  });

  const priceImpactPct: number | null = React.useMemo(() => {
    if (!quoteResponseMeta?.quoteResponse) return null;
    return Number(quoteResponseMeta.quoteResponse.priceImpactPct);
  }, [quoteResponseMeta?.quoteResponse]);

  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    setQuoteResponseMeta(quoteResponseMeta ?? null);
  }, [setQuoteResponseMeta, quoteResponseMeta]);

  React.useEffect(() => {
    setIsLoading(true);
  }, [amount]);

  const lstOutAmount = React.useMemo(() => {
    if (!debouncedAmount || !lstData?.lstSolValue) {
      return 0;
    }
    if (selectedStakingAccount) {
      return debouncedAmount / lstData.lstSolValue;
    }
    if (selectedBank?.info.state.mint.equals(SOL_MINT)) {
      return debouncedAmount / lstData.lstSolValue;
    }
    const outAmount = quoteResponseMeta?.quoteResponse?.outAmount;
    if (outAmount) {
      return JSBI.toNumber(outAmount) / 1e9;
    }

    setIsLoading(false);
    return 0;
  }, [
    debouncedAmount,
    lstData?.lstSolValue,
    selectedStakingAccount,
    selectedBank?.info.state.mint,
    quoteResponseMeta?.quoteResponse?.outAmount,
  ]);

  return (
    <>
      <dl className="grid grid-cols-2 gap-y-2 mb-2 text-sm text-white">
        <Stat label="You will receive">
          {lstOutAmount !== null
            ? lstOutAmount < 0.01 && lstOutAmount > 0
              ? "< 0.01"
              : numeralFormatter(lstOutAmount)
            : "-"}{" "}
          $LST
        </Stat>
      </dl>

      {children}

      {isEnabled && (selectedBank || selectedStakingAccount) && (
        <dl className="grid grid-cols-2 gap-y-2 pt-6 text-sm text-white">
          <Stat label={"TVL"}>
            {lstData && solUsdValue ? (
              `$${numeralFormatter(lstData.tvl * solUsdValue)}`
            ) : (
              <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
            )}
          </Stat>
          <Stat label={"Projected APY"}>
            {lstData ? (
              percentFormatterDyn.format(lstData.projectedApy)
            ) : (
              <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
            )}
          </Stat>
          <Stat label={"Current price"}>
            1 $LST ={" "}
            {lstData ? (
              clampedNumeralFormatter(lstData.lstSolValue)
            ) : (
              <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
            )}{" "}
            SOL
          </Stat>
          <Stat label={"Commission"}>
            {lstData?.solDepositFee ?? <Skeleton className="h-4 w-[45px] bg-[#373F45]" />}%
          </Stat>
          {priceImpactPct !== null && (
            <Stat label={"Price impact"}>
              {priceImpactPct < 0.01 ? "< 0.01%" : `~ ${percentFormatter.format(priceImpactPct)}`}
            </Stat>
          )}
        </dl>
      )}
    </>
  );
};

interface StatProps {
  label: string;
  classNames?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
const Stat = ({ label, classNames, children, style }: StatProps) => {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("flex justify-end text-right items-center gap-2", classNames)} style={style}>
        {children}
      </dd>
    </>
  );
};
