import React from "react";

import { IconChevronDown } from "@tabler/icons-react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeBankRate, cn, LendingModes } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { SelectedBankItem } from "~/components/action-box-v2/components";

type BankTriggerProps = {
  selectedBank: ExtendedBankInfo | null;
  lendingMode: LendingModes;
  isOpen?: boolean;
};

export const BankTrigger = React.forwardRef<HTMLButtonElement, BankTriggerProps>(
  ({ selectedBank, lendingMode, isOpen }, ref) => {
    const calculateRate = React.useCallback(
      (bank: ExtendedBankInfo) => computeBankRate(bank, lendingMode),
      [lendingMode]
    );

    return (
      <Button
        ref={ref}
        className={cn(
          "bg-mfi-action-box-accent text-mfi-action-box-accent-foreground w-full font-normal text-left text-base items-center gap-2.5 transition-colors hover:bg-mfi-action-box-accent/80",
          "justify-start py-6 px-3 xs:pr-2.5 xs:pl-3.5 xs:py-6 xs:justify-center",
          isOpen && "bg-mfi-action-box-accent"
        )}
      >
        {selectedBank && (
          <SelectedBankItem bank={selectedBank} lendingMode={lendingMode} rate={calculateRate(selectedBank)} />
        )}
        {!selectedBank && <>Select token</>}
        <IconChevronDown className="shrink-0" size={20} />
      </Button>
    );
  }
);

BankTrigger.displayName = "BankTrigger";
