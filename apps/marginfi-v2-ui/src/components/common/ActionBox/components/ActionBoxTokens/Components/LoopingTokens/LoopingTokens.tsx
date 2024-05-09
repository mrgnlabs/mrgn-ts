import React from "react";

import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { cn, computeBankRate } from "~/utils";
import { useMrgnlendStore } from "~/store";

import { TokenListWrapper, TokenListCommand, SelectedBankItem } from "../SharedComponents";
import { ActionBoxItem } from "~/components/common/ActionBox/components";
import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { Button } from "~/components/ui/button";
import { IconChevronDown } from "~/components/ui/icons";

import { LendingModes } from "~/types";

type LoopingTokensProps = {
  actionType: ActionType;
  selectedBank: ExtendedBankInfo | null;
  setSelectedBank: (selectedBank: ExtendedBankInfo | null) => void;
};

export const LoopingTokens = ({ selectedBank, setSelectedBank, actionType }: LoopingTokensProps) => {
  const [extendedBankInfos, nativeSolBalance] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
  ]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const lendingMode = React.useMemo(
    () => (actionType === ActionType.Deposit ? LendingModes.LEND : LendingModes.BORROW),
    [actionType]
  );

  const filteredBanks = React.useMemo(() => {
    const ALLOWED_LOOP_BANKS = ["USDC", "USDT", "SOL", "LST"];
    return extendedBankInfos.filter((bank) => {
      return ALLOWED_LOOP_BANKS.includes(bank.meta.tokenSymbol);
    });
  }, [extendedBankInfos]);

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

            <CommandGroup heading="Looping pool">
              {filteredBanks.slice(0, searchQuery.length === 0 ? filteredBanks.length : 3).map((bank, index) => {
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
                  >
                    <ActionBoxItem
                      rate={calculateRate(bank)}
                      lendingMode={lendingMode}
                      bank={bank}
                      showBalanceOverride={true}
                      nativeSolBalance={nativeSolBalance}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </TokenListCommand>
        }
      />
    </div>
  );
};
