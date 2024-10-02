import React from "react";

import { IconChevronDown } from "@tabler/icons-react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, LendingModes } from "@mrgnlabs/mrgn-utils";

import { SelectedBankItem } from "~/components/action-box-v2/components";
import { Button } from "~/components/ui/button";

type BankTriggerProps = {
  bank: ExtendedBankInfo | null;
  isOpen?: boolean;
};

export const BankTrigger = React.forwardRef<HTMLButtonElement, BankTriggerProps>(({ bank, isOpen }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn(
        "bg-background-gray-light text-white w-full font-normal text-left text-base items-center gap-2.5 transition-colors hover:bg-background-gray-light",
        "justify-start py-6 px-3 xs:pr-2.5 xs:pl-3.5 xs:py-6 xs:justify-center",
        isOpen && "bg-background-gray"
      )}
    >
      {bank && <SelectedBankItem bank={bank} lendingMode={LendingModes.BORROW} />}
      {!bank && <>Select token</>}
      <IconChevronDown className="shrink-0" size={20} />
    </Button>
  );
});

BankTrigger.displayName = "BankTrigger";
