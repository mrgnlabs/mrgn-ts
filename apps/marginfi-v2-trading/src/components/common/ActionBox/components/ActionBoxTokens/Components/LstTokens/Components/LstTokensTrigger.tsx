import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { StakeData, cn } from "~/utils";

import { Button } from "~/components/ui/button";
import { IconChevronDown } from "~/components/ui/icons";

import { SelectedBankItem } from "../../SharedComponents";
import { SelectedNativeItem } from "./SelectedNativeItem";

type LstTokensTriggerProps = {
  selectedStakingAccount: StakeData | null;
  selectedBank: ExtendedBankInfo | null;
  isOpen?: boolean;
};

export const LstTokensTrigger = React.forwardRef<HTMLButtonElement, LstTokensTriggerProps>(
  ({ selectedStakingAccount, selectedBank, isOpen }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          "bg-background-gray-light text-white w-15 font-normal text-left text-base items-center gap-2.5 transition-colors hover:bg-background-gray-light",
          "justify-start py-6 px-3",
          isOpen && "bg-background-gray"
        )}
      >
        {selectedStakingAccount ? (
          <SelectedNativeItem stakeData={selectedStakingAccount} />
        ) : (
          <>{selectedBank ? <SelectedBankItem bank={selectedBank} /> : <>Select token</>}</>
        )}
        <IconChevronDown className="shrink-0 ml-2" size={20} />
      </Button>
    );
  }
);

LstTokensTrigger.displayName = "LstTokensTrigger";
