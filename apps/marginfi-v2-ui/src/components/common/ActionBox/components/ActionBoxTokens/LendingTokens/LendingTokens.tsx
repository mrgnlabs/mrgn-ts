import React from "react";

import { PublicKey } from "@solana/web3.js";

import { percentFormatter, aprToApy } from "@mrgnlabs/mrgn-common";
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
      {isDialog && !isRepay && (
        <div className="flex gap-3 w-full items-center">
          {selectedBank && (
            <SelectedBankItem bank={selectedBank} lendingMode={lendingMode} rate={calculateRate(selectedBank)} />
          )}
        </div>
      )}
    </>
  );
};
