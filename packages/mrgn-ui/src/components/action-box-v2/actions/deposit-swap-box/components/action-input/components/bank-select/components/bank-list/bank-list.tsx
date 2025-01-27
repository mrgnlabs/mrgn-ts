import React from "react";

import { WalletToken, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes, cn, computeBankRate } from "@mrgnlabs/mrgn-utils";

import { CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { BankItem, BankListCommand } from "~/components/action-box-v2/components";
import { PublicKey } from "@solana/web3.js";
import { WalletTokenItem } from "./components";

type BankListProps = {
  selectedBank: ExtendedBankInfo | WalletToken | null;
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  isOpen: boolean;
  lendMode: ActionType;
  connected: boolean;
  showTokenSelectionGroups?: boolean;
  onSetSelectedBank: (selectedTokenBank: ExtendedBankInfo | WalletToken | null) => void;
  onClose: () => void;

  walletTokens?: WalletToken[] | null;
};

export const BankList = ({
  selectedBank,
  banks,
  nativeSolBalance,
  lendMode,
  connected,
  showTokenSelectionGroups = true,
  onSetSelectedBank,
  isOpen,
  onClose,
  walletTokens,
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

  // wallet tokens
  const filteredWalletTokens = React.useMemo(() => {
    console.log("walletTokens", walletTokens);
    if (!walletTokens) return [];
    if (searchQuery.length === 0) return walletTokens;
    return walletTokens.filter((token) => token.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [walletTokens, searchQuery]);

  React.useEffect(() => {
    console.log("filteredWalletTokens", filteredWalletTokens);
  }, [filteredWalletTokens]);

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

        {/* WALLET TOKENS */}
        {filteredWalletTokens.length > 0 && onSetSelectedBank && (
          <CommandGroup heading="Available in your wallet">
            {filteredWalletTokens
              .slice(0, searchQuery.length === 0 ? filteredWalletTokens.length : 3)
              .map((token, index) => {
                return (
                  <CommandItem
                    key={index}
                    value={token?.address?.toString().toLowerCase()}
                    onSelect={(currentValue) => {
                      onSetSelectedBank(
                        walletTokens?.find((token) => token.address.toString().toLowerCase() === currentValue) ?? null
                      );
                      onClose();
                    }}
                    className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground"
                  >
                    <WalletTokenItem
                      lendingMode={lendingMode}
                      token={token}
                      showBalanceOverride={true}
                      nativeSolBalance={nativeSolBalance}
                    />
                  </CommandItem>
                );
              })}
          </CommandGroup>
        )}

        {/* 
        TODO: combine lending and wallet tokens into one list 
        */}

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
                    className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground"
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

        {/* GLOBAL & ISOLATED */}
        {globalBanks.length > 0 && onSetSelectedBank && showTokenSelectionGroups && (
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
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent hover:text-mfi-action-box-accent-foreground",
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
        {isolatedBanks.length > 0 && onSetSelectedBank && showTokenSelectionGroups && (
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
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-mfi-action-box-accent data-[selected=true]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent hover:text-mfi-action-box-accent-foreground",
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
