import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { computeBankRate, LendingModes, RepayType } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { IconChevronDown } from "~/components/ui/icons";

import { cn } from "~/utils";
import { SelectedBankItem } from "~/components/common/ActionBoxV2/sharedComponents";

type LendingTokensTriggerProps = {
  selectedBank: ExtendedBankInfo | null;
  lendingMode: LendingModes;
  isOpen?: boolean;
};

export const LendingTokensTrigger = React.forwardRef<HTMLButtonElement, LendingTokensTriggerProps>(
  ({ selectedBank, lendingMode, isOpen }, ref) => {
    const calculateRate = React.useCallback(
      (bank: ExtendedBankInfo) => computeBankRate(bank, lendingMode),
      [lendingMode]
    );

    return (
      <Button
        ref={ref}
        className={cn(
          "bg-background-gray-light text-white w-full font-normal text-left text-base items-center gap-2.5 transition-colors hover:bg-background-gray-light",
          "justify-start py-6 px-3 xs:pr-2.5 xs:pl-3.5 xs:py-6 xs:justify-center",
          isOpen && "bg-background-gray"
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

LendingTokensTrigger.displayName = "LendingTokensTrigger";
