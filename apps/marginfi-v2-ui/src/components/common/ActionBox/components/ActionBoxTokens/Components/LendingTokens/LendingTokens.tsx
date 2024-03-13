import React from "react";

import { PublicKey } from "@solana/web3.js";

import { percentFormatter, aprToApy } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { useMrgnlendStore, useUiStore } from "~/store";
import { Desktop, Mobile } from "~/mediaQueries";
import { RepayType } from "~/utils";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";

import { SelectedBankItem } from "../SharedComponents";
import { LendingTokensList, RepayCollatTokensList, LendingTokensTrigger } from "./Components";

type LendingTokensProps = {
  currentTokenBank?: PublicKey | null;
  repayTokenBank?: PublicKey | null;
  isDialog?: boolean;
  repayType?: RepayType;
  highlightedRepayTokens?: PublicKey[];

  setRepayTokenBank?: (selectedTokenBank: PublicKey | null) => void;
  setCurrentTokenBank?: (selectedTokenBank: PublicKey | null) => void;
};

export const LendingTokens = ({
  currentTokenBank,
  isDialog,
  setCurrentTokenBank,
  repayTokenBank,
  setRepayTokenBank,
  repayType,
  highlightedRepayTokens = [],
}: LendingTokensProps) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedBank = React.useMemo(
    () =>
      currentTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(currentTokenBank))
        : undefined,
    [extendedBankInfos, currentTokenBank]
  );

  const selectedRepayBank = React.useMemo(
    () =>
      repayTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(repayTokenBank))
        : undefined,
    [extendedBankInfos, repayTokenBank]
  );

  const isSelectable = React.useMemo(() => !isDialog || repayType === RepayType.RepayCollat, [isDialog, repayType]);

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
    <>
      {!isSelectable && (
        <div className="flex gap-3 w-full items-center">
          {selectedBank && (
            <SelectedBankItem bank={selectedBank} lendingMode={lendingMode} rate={calculateRate(selectedBank)} />
          )}
        </div>
      )}

      {isSelectable && (
        <>
          <Desktop>
            <Popover open={isOpen} onOpenChange={(open) => setIsOpen(open)} modal={true}>
              <PopoverTrigger asChild>
                <div>
                  <LendingTokensTrigger
                    selectedBank={selectedBank}
                    selectedRepayBank={selectedRepayBank}
                    isOpen={isOpen}
                    repayType={repayType}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="p-1 md:w-[320px] bg-background-gray"
                align="start"
                side="bottom"
                sideOffset={-50}
                avoidCollisions={false}
              >
                <div className="max-h-[calc(100vh-580px)] min-h-[200px] relative overflow-auto">
                  {repayType === RepayType.RepayCollat ? (
                    <LendingTokensList
                      isOpen={isOpen}
                      onClose={() => setIsOpen(false)}
                      selectedBank={selectedBank}
                      onSetCurrentTokenBank={setCurrentTokenBank}
                      isDialog={isDialog}
                    />
                  ) : (
                    <RepayCollatTokensList
                      isOpen={isOpen}
                      onClose={() => setIsOpen(false)}
                      onSetRepayTokenBank={setRepayTokenBank}
                      highlightedRepayTokens={highlightedRepayTokens}
                    />
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </Desktop>
          <Mobile>
            <Drawer open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
              <DrawerTrigger asChild>
                <div>
                  <LendingTokensTrigger
                    selectedBank={selectedBank}
                    selectedRepayBank={selectedRepayBank}
                    isOpen={isOpen}
                    repayType={repayType}
                  />
                </div>
              </DrawerTrigger>
              <DrawerContent className="h-full pb-5">
                <div className="py-8 bg-background-gray h-full">
                  <h3 className="px-3 text-2xl font-semibold">Select Token</h3>
                  {repayType === RepayType.RepayCollat ? (
                    <LendingTokensList
                      isOpen={isOpen}
                      onClose={() => setIsOpen(false)}
                      selectedBank={selectedBank}
                      onSetCurrentTokenBank={setCurrentTokenBank}
                      isDialog={isDialog}
                    />
                  ) : (
                    <RepayCollatTokensList
                      isOpen={isOpen}
                      onClose={() => setIsOpen(false)}
                      onSetRepayTokenBank={setRepayTokenBank}
                      highlightedRepayTokens={highlightedRepayTokens}
                    />
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          </Mobile>
        </>
      )}
    </>
  );
};
