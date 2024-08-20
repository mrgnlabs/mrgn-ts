import React from "react";

import { useRouter } from "next/router";

import { IconInfoCircle } from "@tabler/icons-react";
import { numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore, useUiStore } from "~/store";
import { GroupData } from "~/store/tradeStore";

import { PoolHeader, BankCard } from "~/components/common/Pool";
import { ActionComplete } from "~/components/common/ActionComplete";

import { Loader } from "~/components/ui/loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { DEFAULT_ACCOUNT_SUMMARY } from "@mrgnlabs/marginfi-v2-ui-state";

export default function TradeSymbolPage() {
  const router = useRouter();
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);
  const [initialized, groupMap] = useTradeStore((state) => [state.initialized, state.groupMap]);
  const [activeGroup, setActiveGroup] = React.useState<GroupData | null>(null);

  const accountSummary = React.useMemo(() => activeGroup?.accountSummary ?? DEFAULT_ACCOUNT_SUMMARY, [activeGroup]);

  const healthColor = React.useMemo(() => {
    if (accountSummary.healthFactor) {
      const healthFactor = accountSummary.healthFactor;
      let color: string;

      if (healthFactor >= 0.5) {
        color = "#75BA80"; // green color " : "#",
      } else if (healthFactor >= 0.25) {
        color = "#B8B45F"; // yellow color
      } else {
        color = "#CF6F6F"; // red color
      }

      return color;
    } else {
      return "#fff";
    }
  }, [accountSummary.healthFactor]);

  React.useEffect(() => {
    if (!router.isReady || !initialized) return;

    const symbol = router.query.symbol as string;

    if (!symbol) {
      router.push("/404");
      return;
    }

    const group = groupMap.get(symbol);
    if (!group) {
      router.push("/404");
      return;
    }

    setActiveGroup(group);
  }, [router, groupMap, setActiveGroup, initialized]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12 z-10">
        {(!initialized || !activeGroup) && <Loader label="Loading arena pool..." className="mt-8" />}
        {initialized && activeGroup && activeGroup.pool.token && (
          <div className="flex flex-col items-start gap-8 pb-16 w-full">
            <PoolHeader groupData={activeGroup} />
            <div className="bg-background/80 backdrop-blur-sm border shadow-sm p-6 rounded-xl w-full max-w-6xl mx-auto">
              <h2 className="font-medium text-2xl mb-4">Your position</h2>
              <dl className="flex justify-between items-center gap-2">
                <dt className="flex items-center gap-1.5 text-sm">
                  Lend/borrow health factor
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconInfoCircle size={16} />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="flex flex-col gap-2 pb-2">
                          <p>
                            Health factor is based off <b>price biased</b> and <b>weighted</b> asset and liability
                            values.
                          </p>
                          <div className="font-medium">
                            When your account health reaches 0% or below, you are exposed to liquidation.
                          </div>
                          <p>The formula is:</p>
                          <p className="text-sm italic text-center">{"(assets - liabilities) / (assets)"}</p>
                          <p>Your math is:</p>
                          <p className="text-sm italic text-center">{`(${usdFormatter.format(
                            accountSummary.lendingAmountWithBiasAndWeighted
                          )} - ${usdFormatter.format(
                            accountSummary.borrowingAmountWithBiasAndWeighted
                          )}) / (${usdFormatter.format(accountSummary.lendingAmountWithBiasAndWeighted)})`}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </dt>
                <dd className="text-xl md:text-2xl font-medium" style={{ color: healthColor }}>
                  {numeralFormatter(accountSummary.healthFactor * 100)}%
                </dd>
              </dl>
              <div className="h-2 bg-background-gray-light rounded-full">
                <div
                  className="h-2 rounded-full"
                  style={{
                    backgroundColor: healthColor,
                    width: `${accountSummary.healthFactor * 100}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 w-full mx-auto mt-8 md:grid-cols-2 md:gap-8">
                <BankCard activeGroup={activeGroup} bank={activeGroup.pool.token} />
                <BankCard activeGroup={activeGroup} bank={activeGroup.pool.quoteTokens[0]} />
              </div>
            </div>
          </div>
        )}
      </div>
      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
