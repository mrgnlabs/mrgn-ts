import React from "react";

import { PublicKey } from "@solana/web3.js";

import { percentFormatter, aprToApy } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { useMrgnlendStore, useUiStore } from "~/store";
import { RepayType } from "~/utils";

import { SelectedBankItem, TokenListWrapper } from "../SharedComponents";
import { LendingTokensList, RepayCollatTokensList, LendingTokensTrigger } from "./Components";

type LendingTokensProps = {
  currentTokenBank?: PublicKey | null;
  repayTokenBank?: PublicKey | null;
  isDialog?: boolean;
  repayType?: RepayType;
  blacklistRepayTokens?: PublicKey[];

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
  blacklistRepayTokens = [],
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
        <TokenListWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          Trigger={
            <LendingTokensTrigger
              selectedBank={selectedBank}
              selectedRepayBank={selectedRepayBank}
              isOpen={isOpen}
              repayType={repayType}
            />
          }
          Content={
            repayType === RepayType.RepayCollat ? (
              <RepayCollatTokensList
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSetRepayTokenBank={setRepayTokenBank}
                blacklistRepayTokens={blacklistRepayTokens}
              />
            ) : (
              <LendingTokensList
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                selectedBank={selectedBank}
                onSetCurrentTokenBank={setCurrentTokenBank}
                isDialog={isDialog}
              />
            )
          }
        />
      )}
    </>
  );
};
