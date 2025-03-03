import React from "react";

import { IconChevronDown } from "@tabler/icons-react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem } from "~/components/action-box-v2/components";
import { Button } from "~/components/ui/button";

type BankTriggerProps = {
  actionMode: ActionType;
  bank: ExtendedBankInfo | null;
  isOpen?: boolean;
};

export const BankTrigger = React.forwardRef<HTMLButtonElement, BankTriggerProps>(
  ({ actionMode, bank, isOpen }, ref) => {
    const calculateRate = React.useCallback(
      (bank: ExtendedBankInfo) => {
        return computeBankRate(bank, actionMode === ActionType.Borrow ? LendingModes.BORROW : LendingModes.LEND);
      },
      [actionMode]
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
        {bank && (
          <SelectedBankItem
            bank={bank}
            lendingMode={actionMode === ActionType.Borrow ? LendingModes.BORROW : LendingModes.LEND}
            rate={calculateRate(bank)}
          />
        )}
        {!bank && <>Select token</>}
        <IconChevronDown className="shrink-0" size={20} />
      </Button>
    );
  }
);

BankTrigger.displayName = "BankTrigger";
