import React from "react";

import { numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { IconLoader } from "~/components/ui/icons";

interface AmountPreviewProps {
  actionMode: ActionType;
  amount?: number;
  isLoading?: boolean;
}

export const AmountPreview = ({ actionMode, amount, isLoading }: AmountPreviewProps) => {
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-y-2 text-sm text-white">
        <Stat label="You will receive">
          {isLoading ? (
            <IconLoader size={16} />
          ) : amount ? (
            amount < 0.01 && amount > 0 ? (
              "< 0.01"
            ) : (
              numeralFormatter(amount)
            )
          ) : (
            "-"
          )}{" "}
          {actionMode === ActionType.MintLST ? "$LST" : "SOL"}
        </Stat>
      </dl>
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
