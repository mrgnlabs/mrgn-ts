import React from "react";

import { percentFormatter, aprToApy } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { useLstStore, useUiStore } from "~/store";
import { RepayType, cn } from "~/utils";

import { Button } from "~/components/ui/button";
import { IconChevronDown } from "~/components/ui/icons";

import { SelectedBankItem } from "../../SharedComponents";
import { SelectedNativeItem } from "./SelectedNativeItem";
import { PublicKey } from "@solana/web3.js";

type LstTokensTriggerProps = {
  selectedTokenBank: PublicKey | null;
  selectedBank: ExtendedBankInfo | null;
  isOpen?: boolean;
};

export const LstTokensTrigger = React.forwardRef<HTMLButtonElement, LstTokensTriggerProps>(
  ({ selectedTokenBank, selectedBank, isOpen }, ref) => {
    const [stakeAccounts] = useLstStore((state) => [state.stakeAccounts]);

    const selectedStakeAccount = React.useMemo(
      () => (selectedTokenBank && stakeAccounts.find((value) => value.address.equals(selectedTokenBank))) ?? null,
      [selectedTokenBank, stakeAccounts]
    );

    return (
      <Button
        ref={ref}
        className={cn(
          "bg-background-gray-light text-white w-15 font-normal text-left text-base items-center gap-2.5 transition-colors hover:bg-background-gray-light",
          "justify-start py-6 px-3",
          isOpen && "bg-background-gray"
        )}
      >
        {selectedStakeAccount ? (
          <SelectedNativeItem stakeData={selectedStakeAccount} />
        ) : (
          <>{selectedBank ? <SelectedBankItem bank={selectedBank} /> : <>Select token</>}</>
        )}
        <IconChevronDown className="shrink-0 ml-2" size={20} />
      </Button>
    );
  }
);

LstTokensTrigger.displayName = "LstTokensTrigger";
