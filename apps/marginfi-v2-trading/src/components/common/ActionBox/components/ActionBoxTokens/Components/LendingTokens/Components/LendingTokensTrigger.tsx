import React from "react";

import { IconChevronDown } from "@tabler/icons-react";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { RepayType, cn, computeBankRate } from "@mrgnlabs/mrgn-utils";

import { LendingModes } from "~/types";

import { Button } from "~/components/ui/button";
import { SelectedBankItem } from "../../SharedComponents";

type LendingTokensTriggerProps = {
  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;
  lendingMode: LendingModes;
  isOpen?: boolean;
  repayType?: RepayType;
};

export const LendingTokensTrigger = React.forwardRef<HTMLButtonElement, LendingTokensTriggerProps>(
  ({ selectedBank, selectedRepayBank, lendingMode, isOpen, repayType }, ref) => {
    const isRepayWithCollat = React.useMemo(() => repayType === RepayType.RepayCollat, [repayType]);

    const calculateRate = React.useCallback(
      (bank: ExtendedBankInfo) => computeBankRate(bank, lendingMode),
      [lendingMode]
    );

    return (
      <Button
        ref={ref}
        className={cn(
          "bg-background text-foreground w-full font-normal text-left text-sm items-center gap-2.5 transition-colors hover:bg-background/90",
          "justify-start py-6 px-3 xs:pr-2.5 xs:pl-3.5 xs:py-6 xs:justify-center",
          isOpen && "bg-background"
        )}
      >
        {!isRepayWithCollat && selectedBank && (
          <SelectedBankItem bank={selectedBank} lendingMode={lendingMode} rate={calculateRate(selectedBank)} />
        )}
        {isRepayWithCollat && selectedRepayBank && (
          <SelectedBankItem bank={selectedRepayBank} lendingMode={lendingMode} />
        )}
        {((!isRepayWithCollat && !selectedBank) || (isRepayWithCollat && !selectedRepayBank)) && <>Select token</>}
        <IconChevronDown className="shrink-0" size={20} />
      </Button>
    );
  }
);

LendingTokensTrigger.displayName = "LendingTokensTrigger";
