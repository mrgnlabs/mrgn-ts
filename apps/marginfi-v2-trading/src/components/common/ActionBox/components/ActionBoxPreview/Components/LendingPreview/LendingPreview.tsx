import React from "react";

import { ActionType, DEFAULT_ACCOUNT_SUMMARY, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { GroupData } from "~/store/tradeStore";
import { ActionMethod, cn, RepayWithCollatOptions } from "~/utils";

import { AvailableCollateral } from "./AvailableCollateral";
import { useLendingPreview } from "./useLendingPreview";
import { useTradeStore } from "~/store";

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
  const [marginfiClient] = useTradeStore((state) => [state.marginfiClient]);

  const { preview, previewStats, isLoading, actionMethod } = useLendingPreview({
    marginfiClient: activeGroup?.client ?? marginfiClient,
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
    <div className="flex flex-col gap-4">
      {activeGroup?.selectedAccount && (
        <AvailableCollateral
          isLoading={isLoading}
          marginfiAccount={activeGroup.selectedAccount}
          availableCollateral={preview?.simulationPreview?.availableCollateral}
        />
      )}

      <div>
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
      </div>
    </div>
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
