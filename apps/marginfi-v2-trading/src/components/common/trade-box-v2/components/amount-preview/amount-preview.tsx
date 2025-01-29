import React from "react";

import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { IconLoader } from "~/components/ui/icons";
import { ArenaBank } from "~/types/trade-store.types";

interface AmountPreviewProps {
  tradeSide: "long" | "short";
  depositBank: ArenaBank | null;
  amount: number;
  isLoading?: boolean;
}

export const AmountPreview = ({ tradeSide, amount, isLoading, depositBank }: AmountPreviewProps) => {
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-y-3 text-sm">
        <Stat label={`Size of ${tradeSide}`}>
          {isLoading ? <IconLoader size={16} /> : dynamicNumeralFormatter(amount)}{" "}
          {depositBank?.meta.tokenSymbol.toUpperCase()}
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
