import React from "react";

import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginRequirementType, OperationalState } from "@mrgnlabs/marginfi-client-v2";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { computeBankRate, LendingModes } from "@mrgnlabs/mrgn-utils";

import { cn } from "~/utils";
import { useMrgnlendStore } from "~/store";
import { useActionBoxStore } from "~/hooks/useActionBoxStore";

import { ActionBoxItem } from "~/components/common/ActionBox/components";
import { CommandEmpty, CommandItem } from "~/components/ui/command";
import { Button } from "~/components/ui/button";
import { IconChevronDown } from "~/components/ui/icons";

import { TokenListWrapper, TokenListCommand, SelectedBankItem } from "../SharedComponents";

type LoopingTokensProps = {
  actionType: ActionType;
  selectedBank: ExtendedBankInfo | null;
  setSelectedBank: (selectedBank: ExtendedBankInfo | null) => void;
  isDialog?: boolean;
};

export const LoopingTokens = ({ selectedBank, setSelectedBank, actionType, isDialog }: LoopingTokensProps) => {
  const [extendedBankInfos, nativeSolBalance] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
  ]);

  const [selectedBankStore] = useActionBoxStore(isDialog)((state) => [state.selectedBank]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const lendingMode = React.useMemo(
    () => (actionType === ActionType.Deposit ? LendingModes.LEND : LendingModes.BORROW),
    [actionType]
  );

  const loopingBanks = React.useMemo(() => {
    return extendedBankInfos.filter((bank) => {
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
  }, [extendedBankInfos, searchQuery]);

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) => {
      return computeBankRate(bank, lendingMode);
    },
    [lendingMode]
  );

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <div>
      <TokenListWrapper
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        Trigger={
          <Button
            className={cn(
              "bg-background-gray-light text-white w-full font-normal text-left text-base items-center gap-2.5 transition-colors hover:bg-background-gray-light",
              "justify-start py-6 px-3 xs:pr-2.5 xs:pl-3.5 xs:py-6 xs:justify-center",
              isOpen && "bg-background-gray"
            )}
          >
            {selectedBank ? (
              <SelectedBankItem bank={selectedBank} lendingMode={lendingMode} rate={calculateRate(selectedBank)} />
            ) : (
              <>Select token</>
            )}
            <IconChevronDown className="shrink-0" size={20} />
          </Button>
        }
        Content={
          <TokenListCommand
            selectedBank={selectedBank}
            onClose={() => setIsOpen(false)}
            onSetSearchQuery={setSearchQuery}
          >
            <CommandEmpty>No tokens found.</CommandEmpty>

            {loopingBanks.map((bank, index) => {
              return (
                <CommandItem
                  key={index}
                  value={bank?.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    setSelectedBank(
                      extendedBankInfos.find(
                        (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                      ) ?? null
                    );
                    setIsOpen(false);
                  }}
                  className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
                  disabled={
                    actionType === ActionType.Borrow
                      ? selectedBankStore?.address.equals(bank.address)
                      : bank.info.state.mint.equals(WSOL_MINT)
                      ? nativeSolBalance === 0
                      : bank.userInfo.tokenAccount.balance === 0
                  }
                >
                  <ActionBoxItem
                    rate={calculateRate(bank)}
                    lendingMode={lendingMode}
                    bank={bank}
                    showBalanceOverride={
                      bank.info.state.mint.equals(WSOL_MINT)
                        ? nativeSolBalance > 0
                        : bank.userInfo.tokenAccount.balance > 0
                    }
                    nativeSolBalance={nativeSolBalance}
                  />
                </CommandItem>
              );
            })}
          </TokenListCommand>
        }
      />
    </div>
  );
};
