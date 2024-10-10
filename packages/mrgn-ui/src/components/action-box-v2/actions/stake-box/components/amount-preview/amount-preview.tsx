import React from "react";

import JSBI from "jsbi";
import { SwapMode, useJupiter } from "@jup-ag/react-hook";

import { getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
import {
  percentFormatter,
  numeralFormatter,
  percentFormatterDyn,
  clampedNumeralFormatter,
} from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { StakeData } from "@mrgnlabs/mrgn-utils";

import { cn } from "@mrgnlabs/mrgn-utils";

import { Skeleton } from "~/components/ui/skeleton";

interface AmountPreviewProps {
  selectedBank: ExtendedBankInfo | null;

  actionMode: ActionType;
  isEnabled: boolean;
  amount: number;
  slippageBps: number;
}

export const AmountPreview = ({
  selectedBank,

  actionMode,
  isEnabled,
  amount,
  slippageBps,
}: AmountPreviewProps) => {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    setIsLoading(true);
  }, [amount]);

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-y-2 text-sm text-white">
        <Stat label="You will receive">
          {amount !== null ? (amount < 0.01 && amount > 0 ? "< 0.01" : numeralFormatter(amount)) : "-"}{" "}
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
