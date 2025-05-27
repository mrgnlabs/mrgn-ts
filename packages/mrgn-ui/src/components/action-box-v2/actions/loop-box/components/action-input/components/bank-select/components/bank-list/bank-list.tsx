import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";

import { BankItem, BankListCommand } from "~/components/action-box-v2/components";
import { MarginRequirementType, OperationalState } from "@mrgnlabs/marginfi-client-v2";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";

type BankListProps = {
  selectedBank: ExtendedBankInfo | null;
  otherBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  isOpen: boolean;
  actionMode: ActionType;
  emodeConfig: {
    highlightedEmodeBanks: PublicKey[];
    highlightAll: boolean;
  };

  onSetSelectedBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  onClose: () => void;
};

export const BankList = ({
  selectedBank,
  otherBank,
  banks,
  emodeConfig,
  nativeSolBalance,
  isOpen,
  actionMode,

  onSetSelectedBank,
  onClose,
}: BankListProps) => {
  const [searchQuery, setSearchQuery] = React.useState("");

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) => {
      return computeBankRate(bank, actionMode === ActionType.Borrow ? LendingModes.BORROW : LendingModes.LEND);
    },
    [actionMode]
  );

  const loopingBanks = React.useMemo(() => {
    return banks.filter((bank) => {
      const isIsolated = bank.info.state.isIsolated;
      const isReduceOnly = bank.info.rawBank.config.operationalState === OperationalState.ReduceOnly;
      const isBeingRetired =
        bank.info.rawBank.getAssetWeight(MarginRequirementType.Initial, bank.info.oraclePrice, true).eq(0) &&
        bank.info.rawBank.getAssetWeight(MarginRequirementType.Maintenance, bank.info.oraclePrice).gt(0);
      const containsSearchQuery = searchQuery
        ? bank.meta.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      return !isIsolated && !isReduceOnly && !isBeingRetired && containsSearchQuery;
    });
  }, [banks, searchQuery]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const isDisabled = React.useCallback(
    (bank: ExtendedBankInfo) => {
      const isBorrowing = actionMode === ActionType.Borrow;

      let isDisabled = false;
      const noNativeBalance = bank?.info.state.mint.equals(WSOL_MINT)
        ? nativeSolBalance === 0
        : bank?.userInfo.tokenAccount.balance === 0;

      if (isBorrowing) {
        const isLending = bank.isActive && bank.position.isLending;
        const isOtherBank = otherBank?.address.equals(bank.address) ?? false;

        isDisabled = isOtherBank || isLending;
      } else {
        isDisabled = noNativeBalance;
      }

      return isDisabled;
    },
    [actionMode, otherBank, nativeSolBalance]
  );

  return (
    <>
      <BankListCommand selectedBank={selectedBank} onClose={onClose} onSetSearchQuery={setSearchQuery}>
        <CommandEmpty>No tokens found.</CommandEmpty>

        {loopingBanks.map((bank, index) => {
          return (
            <CommandItem
              key={index}
              value={bank.address?.toString().toLowerCase()}
              onSelect={(currentValue) => {
                onSetSelectedBank(
                  banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                );
                onClose();
              }}
              className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground"
              disabled={isDisabled(bank)}
            >
              <BankItem
                rate={calculateRate(bank)}
                lendingMode={actionMode === ActionType.Borrow ? LendingModes.BORROW : LendingModes.LEND}
                bank={bank}
                showBalanceOverride={
                  bank.info.state.mint.equals(WSOL_MINT) ? nativeSolBalance > 0 : bank.userInfo.tokenAccount.balance > 0
                }
                nativeSolBalance={nativeSolBalance}
                highlightEmodeLabel={
                  emodeConfig.highlightAll
                    ? true
                    : emodeConfig.highlightedEmodeBanks.some((bankAddress) => bankAddress.equals(bank.address))
                }
              />
            </CommandItem>
          );
        })}
      </BankListCommand>
    </>
  );
};
