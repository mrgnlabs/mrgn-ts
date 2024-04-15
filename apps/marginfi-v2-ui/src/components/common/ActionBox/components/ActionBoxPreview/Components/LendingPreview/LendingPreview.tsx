import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore } from "~/store";
import { cn, RepayWithCollatOptions } from "~/utils";

import { AvailableCollateral } from "./AvailableCollateral";
import { useLendingPreview } from "./useLendingPreview";

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  actionMode: ActionType;
  isEnabled: boolean;
  amount: number;
  repayWithCollatOptions?: RepayWithCollatOptions;
  children: React.ReactNode;
}

export const LendingPreview = ({
  selectedBank,
  actionMode,
  isEnabled,
  amount,
  repayWithCollatOptions,
  children,
}: ActionBoxPreviewProps) => {
  const [selectedAccount, accountSummary] = useMrgnlendStore((state) => [state.selectedAccount, state.accountSummary]);

  const { preview, previewStats, isLoading } = useLendingPreview({
    accountSummary,
    actionMode,
    account: selectedAccount,
    bank: selectedBank,
    amount,
    repayWithCollatOptions,
  });

  return (
    <div className="flex flex-col gap-4">
      {selectedAccount && (
        <AvailableCollateral
          isLoading={isLoading}
          marginfiAccount={selectedAccount}
          availableCollateral={preview?.simulationPreview?.availableCollateral}
        />
      )}

      <div>
        {children}

        {isEnabled && selectedBank && (
          <dl className={cn("grid grid-cols-2 gap-y-2 pt-6 text-xs text-white")}>
            {previewStats.map((stat, idx) => (
              <Stat key={idx} label={stat.label} classNames={cn(stat.color)}>
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
