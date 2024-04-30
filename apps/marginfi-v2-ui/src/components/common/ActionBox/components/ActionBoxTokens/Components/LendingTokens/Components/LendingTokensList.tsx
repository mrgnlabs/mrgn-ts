import React from "react";

import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendingModes } from "~/types";
import { useMrgnlendStore } from "~/store";
import { cn, computeBankRate } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { BuyWithMoonpay, ActionBoxItem } from "~/components/common/ActionBox/components";

import { TokenListCommand } from "../../SharedComponents";

type LendingTokensListProps = {
  selectedBank: ExtendedBankInfo | null;
  isOpen: boolean;
  actionMode: ActionType;
  isDialog?: boolean;

  onSetSelectedBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  onClose: () => void;
};

export const LendingTokensList = ({
  selectedBank,
  actionMode,
  onSetSelectedBank,
  isOpen,
  onClose,
}: LendingTokensListProps) => {
  const [extendedBankInfos, nativeSolBalance] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
  ]);

  const lendingMode = React.useMemo(
    () => (actionMode === ActionType.Deposit ? LendingModes.LEND : LendingModes.BORROW),
    [actionMode]
  );

  const [searchQuery, setSearchQuery] = React.useState("");
  const { connected } = useWalletContext();

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) => {
      return computeBankRate(bank, lendingMode);
    },
    [lendingMode]
  );

  const hasTokens = React.useMemo(() => {
    const hasBankTokens = !!extendedBankInfos.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );

    return hasBankTokens;
  }, [extendedBankInfos]);

  /////// FILTERS

  // filter on balance
  const balanceFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo) => {
      const isWSOL = bankInfo.info.state.mint?.equals ? bankInfo.info.state.mint.equals(WSOL_MINT) : false;
      const balance = isWSOL
        ? bankInfo.userInfo.tokenAccount.balance + nativeSolBalance
        : bankInfo.userInfo.tokenAccount.balance;
      return balance > 0;
    },
    [nativeSolBalance]
  );

  // filter on search
  const searchFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo) => {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      return bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery);
    },
    [searchQuery]
  );

  // filter on positions
  const positionFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo, filterActive?: boolean) =>
      bankInfo.isActive ? lendingMode === LendingModes.LEND && bankInfo.position.isLending : filterActive,
    [lendingMode]
  );

  /////// BANKS

  // wallet banks
  const filteredBanksUserOwns = React.useMemo(() => {
    return (
      extendedBankInfos
        .filter(balanceFilter)
        .filter(searchFilter)
        // .filter((bank) => positionFilter(bank, true))
        .sort((a, b) => {
          const isFirstWSOL = a.info.state.mint?.equals ? a.info.state.mint.equals(WSOL_MINT) : false;
          const isSecondWSOL = b.info.state.mint?.equals ? b.info.state.mint.equals(WSOL_MINT) : false;
          const firstBalance =
            (isFirstWSOL ? a.userInfo.tokenAccount.balance + nativeSolBalance : a.userInfo.tokenAccount.balance) *
            a.info.state.price;
          const secondBalance =
            (isSecondWSOL ? b.userInfo.tokenAccount.balance + nativeSolBalance : b.userInfo.tokenAccount.balance) *
            b.info.state.price;
          return secondBalance - firstBalance;
        })
    );
  }, [extendedBankInfos, searchFilter, nativeSolBalance, balanceFilter]);

  // active position banks
  const filteredBanksActive = React.useMemo(() => {
    return extendedBankInfos
      .filter(searchFilter)
      .filter((bankInfo) => positionFilter(bankInfo, false))
      .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0));
  }, [extendedBankInfos, searchFilter, positionFilter]);

  // other banks without positions
  const filteredBanks = React.useMemo(() => {
    return extendedBankInfos.filter(searchFilter);
  }, [extendedBankInfos, searchFilter]);

  const globalBanks = React.useMemo(() => filteredBanks.filter((bank) => !bank.info.state.isIsolated), [filteredBanks]);
  const isolatedBanks = React.useMemo(
    () => filteredBanks.filter((bank) => bank.info.state.isIsolated),
    [filteredBanks]
  );

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <>
      <TokenListCommand selectedBank={selectedBank} onClose={onClose} onSetSearchQuery={setSearchQuery}>
        {!hasTokens && <BuyWithMoonpay />}
        <CommandEmpty>No tokens found.</CommandEmpty>

        {/* LENDING */}
        {lendingMode === LendingModes.LEND && connected && filteredBanksUserOwns.length > 0 && onSetSelectedBank && (
          <CommandGroup heading="Available in your wallet">
            {filteredBanksUserOwns
              .slice(0, searchQuery.length === 0 ? filteredBanksUserOwns.length : 3)
              .map((bank, index) => {
                return (
                  <CommandItem
                    key={index}
                    value={bank?.address?.toString().toLowerCase()}
                    onSelect={(currentValue) => {
                      onSetSelectedBank(
                        extendedBankInfos.find(
                          (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                        ) ?? null
                      );
                      onClose();
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
        )}
        {lendingMode === LendingModes.LEND && filteredBanksActive.length > 0 && onSetSelectedBank && (
          <CommandGroup heading="Currently supplying">
            {filteredBanksActive.map((bank, index) => (
              <CommandItem
                key={index}
                value={bank.address?.toString().toLowerCase()}
                // disabled={!ownedBanksPk.includes(bank.address)}
                onSelect={(currentValue) => {
                  onSetSelectedBank(
                    extendedBankInfos.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ??
                      null
                  );
                  onClose();
                }}
                className={cn(
                  "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white py-2"
                )}
              >
                <ActionBoxItem
                  rate={calculateRate(bank)}
                  lendingMode={lendingMode}
                  bank={bank}
                  showBalanceOverride={false}
                  nativeSolBalance={nativeSolBalance}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* BORROWING */}
        {lendingMode === LendingModes.BORROW && filteredBanksActive.length > 0 && onSetSelectedBank && (
          <CommandGroup heading="Currently borrowing">
            {filteredBanksActive.map((bank, index) => (
              <CommandItem
                key={index}
                value={bank.address?.toString().toLowerCase()}
                onSelect={(currentValue) => {
                  onSetSelectedBank(
                    extendedBankInfos.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ??
                      null
                  );
                  onClose();
                }}
                className={cn(
                  "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
                )}
              >
                <ActionBoxItem
                  rate={calculateRate(bank)}
                  lendingMode={lendingMode}
                  bank={bank}
                  showBalanceOverride={false}
                  nativeSolBalance={nativeSolBalance}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* GLOBAL & ISOLATED */}
        {globalBanks.length > 0 && onSetSelectedBank && (
          <CommandGroup heading="Global pools">
            {globalBanks.map((bank, index) => {
              return (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    onSetSelectedBank(
                      extendedBankInfos.find(
                        (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                      ) ?? null
                    );
                    onClose();
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white",
                    lendingMode === LendingModes.LEND && "py-2",
                    lendingMode === LendingModes.BORROW && "h-[60px]"
                  )}
                >
                  <ActionBoxItem
                    rate={calculateRate(bank)}
                    lendingMode={lendingMode}
                    bank={bank}
                    showBalanceOverride={false}
                    nativeSolBalance={nativeSolBalance}
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        {isolatedBanks.length > 0 && onSetSelectedBank && (
          <CommandGroup heading="Isolated pools">
            {isolatedBanks.map((bank, index) => {
              return (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    onSetSelectedBank(
                      extendedBankInfos.find(
                        (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                      ) ?? null
                    );
                    onClose();
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white",
                    lendingMode === LendingModes.LEND && "py-2",
                    lendingMode === LendingModes.BORROW && "h-[60px]"
                  )}
                >
                  <ActionBoxItem
                    rate={calculateRate(bank)}
                    lendingMode={lendingMode}
                    bank={bank}
                    showBalanceOverride={false}
                    nativeSolBalance={nativeSolBalance}
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </TokenListCommand>
    </>
  );
};
