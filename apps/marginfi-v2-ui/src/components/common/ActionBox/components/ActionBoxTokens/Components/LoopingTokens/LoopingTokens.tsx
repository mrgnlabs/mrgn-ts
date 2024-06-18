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
import { useActionBoxStore } from "~/hooks/useActionBoxStore";

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

  const ALLOWED_LOOP_STABLE_BANKS = React.useMemo(() => ["USDC", "USDT", "USDY", "UXD"], []);

  const ALLOWED_LOOP_LST_BANKS = React.useMemo(
    () => [
      "SOL",
      "LST",
      "JitoSOL",
      "mSOL",
      "bSOL",
      "bonkSOL",
      "jucySOL",
      "compassSOL",
      "laineSOL",
      "jupSOL",
      "picoSOL",
    ],
    []
  );

  const lendingMode = React.useMemo(
    () => (actionType === ActionType.Deposit ? LendingModes.LEND : LendingModes.BORROW),
    [actionType]
  );

  const stableBanks = React.useMemo(() => {
    return extendedBankInfos
      .filter((bank) => {
        return ALLOWED_LOOP_STABLE_BANKS.includes(bank.meta.tokenSymbol);
      })
      .filter((bank) => {
        if (!searchQuery) return true;
        return bank.meta.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [extendedBankInfos, searchQuery, ALLOWED_LOOP_STABLE_BANKS]);

  const lstBanks = React.useMemo(() => {
    return extendedBankInfos
      .filter((bank) => {
        return ALLOWED_LOOP_LST_BANKS.includes(bank.meta.tokenSymbol);
      })
      .filter((bank) => {
        if (!searchQuery) return true;
        return bank.meta.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [extendedBankInfos, searchQuery, ALLOWED_LOOP_LST_BANKS]);

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) => {
      return computeBankRate(bank, lendingMode);
    },
    [lendingMode]
  );

  const selectedBankIsStable = React.useMemo(() => {
    if (!selectedBankStore) return false;
    return ALLOWED_LOOP_STABLE_BANKS.includes(selectedBankStore.meta.tokenSymbol);
  }, [selectedBankStore, ALLOWED_LOOP_STABLE_BANKS]);

  const selectedBankIsLst = React.useMemo(() => {
    if (!selectedBankStore) return false;
    return ALLOWED_LOOP_LST_BANKS.includes(selectedBankStore.meta.tokenSymbol);
  }, [selectedBankStore, ALLOWED_LOOP_LST_BANKS]);

  const shouldRenderStableBanks = React.useMemo(() => {
    const hasStables = stableBanks.length > 0;
    if (!hasStables) return false;
    if (actionType === ActionType.Borrow) return selectedBankIsStable;

    return true;
  }, [actionType, selectedBankIsStable, stableBanks]);

  const shouldRenderLstBanks = React.useMemo(() => {
    const hasLsts = lstBanks.length > 0;
    if (!hasLsts) return false;
    if (actionType === ActionType.Borrow) return selectedBankIsLst;

    return true;
  }, [actionType, selectedBankIsLst, lstBanks]);

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

            {shouldRenderStableBanks && (
              <CommandGroup heading="Stablecoins">
                {stableBanks.map((bank, index) => {
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
                          : bank.userInfo.tokenAccount.balance === 0
                      }
                    >
                      <ActionBoxItem
                        rate={calculateRate(bank)}
                        lendingMode={lendingMode}
                        bank={bank}
                        showBalanceOverride={bank.userInfo.tokenAccount.balance > 0}
                        nativeSolBalance={nativeSolBalance}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {shouldRenderLstBanks && (
              <CommandGroup heading="Liquid staking tokens">
                {lstBanks.map((bank, index) => {
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
                          : bank.userInfo.tokenAccount.balance === 0
                      }
                    >
                      <ActionBoxItem
                        rate={calculateRate(bank)}
                        lendingMode={lendingMode}
                        bank={bank}
                        showBalanceOverride={bank.userInfo.tokenAccount.balance > 0}
                        nativeSolBalance={nativeSolBalance}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </TokenListCommand>
        }
      />
    </div>
  );
};
