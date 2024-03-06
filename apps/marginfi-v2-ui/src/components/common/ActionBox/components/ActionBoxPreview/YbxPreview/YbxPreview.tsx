import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore } from "~/store";
import { cn } from "~/utils";

import { Skeleton } from "~/components/ui/skeleton";
import { IconArrowRight } from "~/components/ui/icons";

import { AvailableCollateral } from "./AvailableCollateral";

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  isEnabled: boolean;
  amount: number;
  children: React.ReactNode;
}

export const YbxPreview = ({ selectedBank, isEnabled, amount, children }: ActionBoxPreviewProps) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  // TODO logic

  return (
    <>
      <AvailableCollateral isLoading={false} />
      {/* marginfiAccount={} */}

      {children}

      {isEnabled && selectedBank && (
        <dl className="grid grid-cols-2 gap-y-2 pt-6 text-sm text-white">
          <Stat label={"Your mint account"}>0</Stat>
          <Stat label={"Liquidation price"}>
            0 <IconArrowRight width={12} height={12} /> 2
          </Stat>
          <Stat label={"Stats"}>--</Stat>
          <Stat label={"Stats"}>--</Stat>
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
