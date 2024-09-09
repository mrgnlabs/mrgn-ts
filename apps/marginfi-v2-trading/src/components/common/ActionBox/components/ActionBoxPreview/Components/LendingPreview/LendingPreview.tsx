import React from "react";

import { ActionType, DEFAULT_ACCOUNT_SUMMARY, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { usdFormatterDyn } from "@mrgnlabs/mrgn-common";

import { GroupData } from "~/store/tradeStore";
import { ActionMethod, cn, RepayWithCollatOptions } from "~/utils";
import { useLendingPreview } from "./useLendingPreview";

import { Skeleton } from "~/components/ui/skeleton";

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  activeGroup: GroupData | null;
  actionMode: ActionType;
  isEnabled: boolean;
  amount: number;
  repayWithCollatOptions?: RepayWithCollatOptions;
  addAdditionalsPopup: (actions: ActionMethod[]) => void;
  children: React.ReactNode;
}

export const LendingPreview = ({
  selectedBank,
  activeGroup,
  actionMode,
  isEnabled,
  amount,
  repayWithCollatOptions,
  addAdditionalsPopup,
  children,
}: ActionBoxPreviewProps) => {
  const { preview, previewStats, isLoading, actionMethod } = useLendingPreview({
    marginfiClient: activeGroup?.client ?? null,
    accountSummary: activeGroup?.accountSummary ?? DEFAULT_ACCOUNT_SUMMARY,
    actionMode,
    account: activeGroup?.selectedAccount ?? null,
    bank: selectedBank,
    amount,
    repayWithCollatOptions,
  });

  React.useEffect(() => {
    addAdditionalsPopup(actionMethod ? [actionMethod] : []);
    // DO NOT REMOVE THIS, inifite bug if you do
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionMethod]);

  return (
    <>
      {children}

      {isEnabled && selectedBank && (
        <dl className={cn("grid grid-cols-2 gap-y-2 pt-6 text-xs")}>
          {previewStats.map((stat, idx) => (
            <Stat
              key={idx}
              label={stat.label}
              classNames={cn(
                stat.color &&
                  (stat.color === "SUCCESS"
                    ? "text-success"
                    : stat.color === "ALERT"
                    ? "text-alert-foreground"
                    : "text-destructive-foreground")
              )}
            >
              <stat.value />
            </Stat>
          ))}
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
