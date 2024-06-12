import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore } from "~/store";
import { ActionMethod, cn, LoopingOptions, RepayWithCollatOptions } from "~/utils";

import { useLoopingPreview } from "./useLoopingPreview";

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  actionMode: ActionType;
  isEnabled: boolean;
  amount: number;
  loopOptions?: LoopingOptions;
  addAdditionalsPopup: (actions: ActionMethod[]) => void;
  children: React.ReactNode;
}

export const LoopPreview = ({
  selectedBank,
  actionMode,
  isEnabled,
  amount,
  loopOptions,
  addAdditionalsPopup,
  children,
}: ActionBoxPreviewProps) => {
  const [marginfiClient, selectedAccount, accountSummary] = useMrgnlendStore((state) => [
    state.marginfiClient,
    state.selectedAccount,
    state.accountSummary,
  ]);

  const { preview, previewStats, isLoading, actionMethod } = useLoopingPreview({
    marginfiClient,
    accountSummary,
    actionMode,
    account: selectedAccount,
    bank: selectedBank,
    amount,
    loopOptions,
  });

  React.useEffect(() => {
    addAdditionalsPopup(actionMethod ? [actionMethod] : []);
    // DO NOT REMOVE THIS, inifite bug if you do
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionMethod]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        {children}

        {isEnabled && selectedBank && (
          <dl className={cn("grid grid-cols-2 gap-y-2 pt-6 text-xs text-white")}>
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
