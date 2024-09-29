import React from "react";

import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes, cn, computeBankRate } from "@mrgnlabs/mrgn-utils";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { BankItem, BankListCommand } from "~/components/action-box-v2/components";

type BankListProps = {
  selectedBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  isOpen: boolean;
  lendMode: ActionType;
  connected: boolean;

  onSetSelectedBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  onClose: () => void;
};

export const BankList = ({
  selectedBank,
  banks,
  nativeSolBalance,
  lendMode,
  connected,
  onSetSelectedBank,
  isOpen,
  onClose,
}: BankListProps) => {
  const lendingMode = React.useMemo(
    () =>
      lendMode === ActionType.Deposit || lendMode === ActionType.Withdraw ? LendingModes.LEND : LendingModes.BORROW,
    [lendMode]
  );

  const [searchQuery, setSearchQuery] = React.useState("");

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) => {
      return computeBankRate(bank, lendingMode);
    },
    [lendingMode]
  );

  const hasTokens = React.useMemo(() => {
    const hasBankTokens = !!banks.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );

    return hasBankTokens;
  }, [banks]);

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
      banks
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
  }, [banks, balanceFilter, searchFilter, nativeSolBalance]);

  // active position banks
  const filteredBanksActive = React.useMemo(() => {
    return banks
      .filter(searchFilter)
      .filter((bankInfo) => positionFilter(bankInfo, false))
      .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0));
  }, [banks, searchFilter, positionFilter]);

  // other banks without positions
  const filteredBanks = React.useMemo(() => {
    return banks.filter(searchFilter);
  }, [banks, searchFilter]);

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
      <BankListCommand selectedBank={selectedBank} onClose={onClose} onSetSearchQuery={setSearchQuery}>
        {!hasTokens && (
          <div className="text-sm text-[#C0BFBF] font-normal p-3">
            You don&apos;t own any supported tokens in marginfi. Check out what marginfi supports.
          </div>
        )}
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
                        banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                      );
                      onClose();
                    }}
                    className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
                  >
                    <BankItem
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
                    banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                  );
                  onClose();
                }}
                className={cn(
                  "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white py-2"
                )}
              >
                <BankItem
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
                    banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                  );
                  onClose();
                }}
                className={cn(
                  "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
                )}
              >
                <BankItem
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
                      banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                    );
                    onClose();
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white",
                    lendingMode === LendingModes.LEND && "py-2",
                    lendingMode === LendingModes.BORROW && "h-[60px]"
                  )}
                >
                  <BankItem
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
                      banks.find((bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue) ?? null
                    );
                    onClose();
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white",
                    lendingMode === LendingModes.LEND && "py-2",
                    lendingMode === LendingModes.BORROW && "h-[60px]"
                  )}
                >
                  <BankItem
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
      </BankListCommand>
    </>
  );
};
