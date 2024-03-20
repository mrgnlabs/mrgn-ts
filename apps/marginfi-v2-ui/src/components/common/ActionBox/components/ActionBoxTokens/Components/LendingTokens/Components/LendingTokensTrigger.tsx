import React from "react";

import { percentFormatter, aprToApy } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { useUiStore } from "~/store";
import { RepayType, cn } from "~/utils";

import { Button } from "~/components/ui/button";
import { IconChevronDown } from "~/components/ui/icons";

import { SelectedBankItem } from "../../SharedComponents";

type LendingTokensTriggerProps = {
  selectedBank?: ExtendedBankInfo;
  selectedRepayBank?: ExtendedBankInfo;
  isOpen?: boolean;
  repayType?: RepayType;
};

export const LendingTokensTrigger = React.forwardRef<HTMLButtonElement, LendingTokensTriggerProps>(
  ({ selectedBank, selectedRepayBank, isOpen, repayType }, ref) => {
    const [lendingMode] = useUiStore((state) => [state.lendingMode]);

    const isRepayWithCollat = React.useMemo(() => repayType === RepayType.RepayCollat, [repayType]);

    const calculateRate = React.useCallback(
      (bank: ExtendedBankInfo) => {
        const isInLendingMode = lendingMode === LendingModes.LEND;

        const interestRate = isInLendingMode ? bank.info.state.lendingRate : bank.info.state.borrowingRate;
        const emissionRate = isInLendingMode
          ? bank.info.state.emissions == Emissions.Lending
            ? bank.info.state.emissionsRate
            : 0
          : bank.info.state.emissions == Emissions.Borrowing
          ? bank.info.state.emissionsRate
          : 0;

        const aprRate = interestRate + emissionRate;
        const apyRate = aprToApy(aprRate);

        return percentFormatter.format(apyRate);
      },
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
