import React from "react";

import { IconChevronDown } from "@tabler/icons-react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";

import { cn } from "~/utils";
import { SelectedBankItem } from "~/components/common/ActionBoxV2/sharedComponents";

type RepayCollatTokensTriggerProps = {
  bank: ExtendedBankInfo | null;
  lendingMode: LendingModes;
  isOpen?: boolean;
};

export const RepayCollatTokensTrigger = React.forwardRef<HTMLButtonElement, RepayCollatTokensTriggerProps>(
  ({ bank, lendingMode, isOpen }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          "bg-background-gray-light text-white w-full font-normal text-left text-base items-center gap-2.5 transition-colors hover:bg-background-gray-light",
          "justify-start py-6 px-3 xs:pr-2.5 xs:pl-3.5 xs:py-6 xs:justify-center",
          isOpen && "bg-background-gray"
        )}
      >
        {bank && <SelectedBankItem bank={bank} lendingMode={lendingMode} />}
        {!bank && <>Select token</>}
        <IconChevronDown className="shrink-0" size={20} />
      </Button>
    );
  }
);

RepayCollatTokensTrigger.displayName = "RepayCollatTokensTrigger";
