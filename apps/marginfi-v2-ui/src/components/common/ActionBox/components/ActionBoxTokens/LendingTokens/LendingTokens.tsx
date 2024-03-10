import React from "react";

import { PublicKey } from "@solana/web3.js";

import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { useMrgnlendStore, useUiStore } from "~/store";
import { Desktop, Mobile } from "~/mediaQueries";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

import { SelectedBankItem } from "../SharedComponents";
import { LendingTokensList } from "./LendingTokensList";
import { LendingTokensTrigger } from "./LendingTokensTrigger";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";

type LendingTokensProps = {
  currentTokenBank?: PublicKey | null;
  setCurrentTokenBank?: (selectedTokenBank: PublicKey | null) => void;
  repayTokenBank?: PublicKey | null;
  setRepayTokenBank?: (selectedTokenBank: PublicKey | null) => void;
  isDialog?: boolean;
  isRepay?: boolean;
  highlightedTokens?: PublicKey[];
};

export const LendingTokens = ({
  currentTokenBank,
  isDialog,
  setCurrentTokenBank,
  repayTokenBank,
  setRepayTokenBank,
  isRepay = false,
  highlightedTokens = [],
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

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) =>
      percentFormatter.format(
        (lendingMode === LendingModes.LEND ? bank.info.state.lendingRate : bank.info.state.borrowingRate) +
          (lendingMode === LendingModes.LEND && bank.info.state.emissions == Emissions.Lending
            ? bank.info.state.emissionsRate
            : 0) +
          (lendingMode !== LendingModes.LEND && bank.info.state.emissions == Emissions.Borrowing
            ? bank.info.state.emissionsRate
            : 0)
      ),
    [lendingMode]
  );

  return (
    <>
      {isDialog && !isRepay && (
        <div className="flex gap-3 w-full items-center">
          {selectedBank && (
            <SelectedBankItem bank={selectedBank} lendingMode={lendingMode} rate={calculateRate(selectedBank)} />
          )}
        </div>
      )}

      {(!isDialog || isRepay) && (
        <>
          <Desktop>
            <Popover open={isOpen} onOpenChange={(open) => setIsOpen(open)} modal={true}>
              <PopoverTrigger asChild>
                <div>
                  <LendingTokensTrigger
                    selectedBank={selectedBank}
                    selectedRepayBank={selectedRepayBank}
                    isOpen={isOpen}
                    isRepay={isRepay}
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
                  <LendingTokensList
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    selectedBank={selectedBank}
                    onSetCurrentTokenBank={setCurrentTokenBank}
                    onSetRepayTokenBank={setRepayTokenBank}
                    isDialog={isDialog}
                    highlightedTokens={highlightedTokens}
                    isRepay={isRepay}
                  />
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
                    isRepay={isRepay}
                  />
                </div>
              </DrawerTrigger>
              <DrawerContent className="h-full pb-5">
                <div className="py-8 bg-background-gray h-full">
                  <h3 className="px-3 text-2xl font-semibold">Select Token</h3>

                  <LendingTokensList
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    selectedBank={selectedBank}
                    onSetCurrentTokenBank={setCurrentTokenBank}
                    onSetRepayTokenBank={setRepayTokenBank}
                    isDialog={isDialog}
                    highlightedTokens={highlightedTokens}
                    isRepay={isRepay}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          </Mobile>
        </>
      )}
    </>
  );
};
