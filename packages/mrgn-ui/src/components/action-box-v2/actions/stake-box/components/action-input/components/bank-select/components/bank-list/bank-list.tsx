import React from "react";

import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { BankItem, BankListCommand } from "~/components/action-box-v2/components";
import { cn } from "@mrgnlabs/mrgn-utils";

type BankListProps = {
  selectedBank: ExtendedBankInfo | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  isOpen: boolean;

  onSetSelectedBank: (selectedTokenBank: ExtendedBankInfo | null) => void;
  onClose: () => void;
};

export const BankList = ({
  selectedBank,
  banks,
  nativeSolBalance,

  onSetSelectedBank,
  isOpen,
  onClose,
}: BankListProps) => {
  const [searchQuery, setSearchQuery] = React.useState("");

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

  const positionFilter = React.useCallback(
    (bankInfo: ExtendedBankInfo, filterActive?: boolean) =>
      bankInfo.isActive ? bankInfo.position.isLending : filterActive,
    []
  );

  /////// BANKS
  // wallet banks
  const filteredBanksUserOwns = React.useMemo(() => {
    return (
      banks
        .filter(balanceFilter)
        .filter(searchFilter)
        .filter((bank) => bank.meta.tokenSymbol !== "LST")
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

  const filteredBanksActive = React.useMemo(() => {
    return banks
      .filter(searchFilter)
      .filter((bankInfo) => positionFilter(bankInfo, false))
      .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0));
  }, [banks, searchFilter, positionFilter]);

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
      test
      <BankListCommand selectedBank={selectedBank} onClose={onClose} onSetSearchQuery={setSearchQuery}>
        {!hasTokens && (
          <div className="text-sm text-[#C0BFBF] font-normal p-3">
            You don&apos;t own any supported tokens in marginfi. Check out what marginfi supports.
          </div>
        )}
        <CommandEmpty>No tokens found.</CommandEmpty>

        {filteredBanksUserOwns.length > 0 && onSetSelectedBank && (
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
                    className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground"
                  >
                    <BankItem bank={bank} showBalanceOverride={true} nativeSolBalance={nativeSolBalance} />
                  </CommandItem>
                );
              })}
          </CommandGroup>
        )}

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
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent hover:text-mfi-action-box-accent-foreground"
                  )}
                >
                  <BankItem bank={bank} showBalanceOverride={false} nativeSolBalance={nativeSolBalance} />
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
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent hover:text-mfi-action-box-accent-foreground"
                  )}
                >
                  <BankItem bank={bank} showBalanceOverride={false} nativeSolBalance={nativeSolBalance} />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </BankListCommand>
    </>
  );
};
