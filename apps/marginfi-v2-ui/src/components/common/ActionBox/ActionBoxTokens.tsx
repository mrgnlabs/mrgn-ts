import React from "react";

import Image from "next/image";

import { numeralFormatter, usdFormatter, percentFormatter, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore, useUiStore } from "~/store";

import { cn } from "~/utils";

import { useWalletContext } from "~/hooks/useWalletContext";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Button } from "~/components/ui/button";

import { IconChevronDown, IconX } from "~/components/ui/icons";

import { LendingModes } from "~/types";

type ActionBoxTokensProps = {
  currentToken: ExtendedBankInfo | null;
  setCurrentToken: (selectedToken: ExtendedBankInfo | null) => void;
};

export const ActionBoxTokens = ({ currentToken, setCurrentToken }: ActionBoxTokensProps) => {
  const [extendedBankInfos, nativeSolBalance] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
  ]);
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isTokenPopoverOpen, setIsTokenPopoverOpen] = React.useState(false);
  const { connected } = useWalletContext();

  const calculateRate = React.useCallback(
    (bank: ExtendedBankInfo) =>
      percentFormatter.format(
        (lendingMode === LendingModes.LEND ? bank.info.state.lendingRate : bank.info.state.borrowingRate) +
          (lendingMode === LendingModes.LEND && bank.info.state.emissions == Emissions.Lending
            ? bank.info.state.emissionsRate
            : 0) +
          (lendingMode !== LendingModes.LEND && bank.info.state.emissions == Emissions.Borrowing
            ? bank.info.state.emissionsRate
            : 0)
      ),
    [lendingMode]
  );

  const filteredBanks = React.useMemo(() => {
    const lowerCaseSearchQuery = searchQuery.toLowerCase();

    return extendedBankInfos
      .filter((bankInfo) => bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery))
      .filter((bankInfo) => (lendingMode === LendingModes.LEND ? bankInfo.userInfo.tokenAccount.balance === 0 : true));
  }, [extendedBankInfos, searchQuery]);

  const filteredBanksActiveLending = React.useMemo(() => {
    const lowerCaseSearchQuery = searchQuery.toLowerCase();
    return extendedBankInfos
      .filter((bankInfo) => bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery))
      .filter((bankInfo) => bankInfo.isActive && bankInfo.position?.isLending)
      .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0));
  }, [extendedBankInfos, searchQuery]);

  const filteredBanksActiveBorrowing = React.useMemo(() => {
    const lowerCaseSearchQuery = searchQuery.toLowerCase();
    return extendedBankInfos
      .filter((bankInfo) => bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery))
      .filter((bankInfo) => bankInfo.isActive && !bankInfo.position?.isLending)
      .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0));
  }, [extendedBankInfos, searchQuery]);

  const filteredBanksUserOwns = React.useMemo(() => {
    const lowerCaseSearchQuery = searchQuery.toLowerCase();

    return extendedBankInfos
      .filter((bankInfo) => {
        const isWSOL = bankInfo.info.state.mint?.equals ? bankInfo.info.state.mint.equals(WSOL_MINT) : false;
        const balance = isWSOL
          ? bankInfo.userInfo.tokenAccount.balance + nativeSolBalance
          : bankInfo.userInfo.tokenAccount.balance;
        return balance > 0 && bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery);
      })
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
      });
  }, [extendedBankInfos, searchQuery]);

  React.useEffect(() => {
    if (!isTokenPopoverOpen) {
      setSearchQuery("");
    }
  }, [isTokenPopoverOpen]);

  return (
    <Popover open={isTokenPopoverOpen} onOpenChange={(open) => setIsTokenPopoverOpen(open)}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "bg-background-gray-light text-white text-left text-lg p-6 pr-5 gap-2.5 transition-colors hover:bg-background-gray",
            isTokenPopoverOpen && "bg-background-gray w-[300px]"
          )}
        >
          {currentToken && (
            <>
              <Image
                src={currentToken.meta.tokenLogoUri!}
                alt={currentToken.meta.tokenName}
                width={28}
                height={28}
                className="rounded-full"
              />
              <div className="">
                <p className="leading-none">{currentToken.meta.tokenSymbol}</p>
                <p
                  className={cn(
                    "text-sm font-normal leading-none",
                    lendingMode === LendingModes.LEND && "text-success",
                    lendingMode === LendingModes.BORROW && "text-error"
                  )}
                >
                  {calculateRate(currentToken) + ` ${lendingMode === LendingModes.LEND ? "APY" : "APR"}`}
                </p>
              </div>
            </>
          )}
          {!currentToken && <>Select token</>}
          <IconChevronDown className="shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-1 w-[320px] bg-background-gray"
        align="start"
        side="bottom"
        sideOffset={-50}
        avoidCollisions={false}
      >
        <Command
          className="bg-background-gray relative"
          shouldFilter={false}
          value={currentToken?.address?.toString().toLowerCase() ?? ""}
          onValueChange={(value) =>
            setCurrentToken(extendedBankInfos.find((bank) => bank.address.toString() === value) || currentToken)
          }
        >
          <CommandInput
            placeholder="Search token..."
            className="h-12"
            onValueChange={(value) => setSearchQuery(value)}
          />
          <button onClick={() => setIsTokenPopoverOpen(false)} className="absolute top-2.5 right-2">
            <IconX size={18} className="text-white/50" />
          </button>
          <CommandEmpty>No tokens found.</CommandEmpty>
          {lendingMode === LendingModes.LEND && connected && filteredBanksUserOwns.length > 0 && (
            <CommandGroup heading="Available in your wallet">
              {filteredBanksUserOwns.slice(0, searchQuery.length === 0 ? 5 : 3).map((bank, index) => (
                <CommandItem
                  key={index}
                  value={bank?.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    setCurrentToken(
                      extendedBankInfos.find(
                        (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                      ) ?? null
                    );
                    setIsTokenPopoverOpen(false);
                  }}
                  className="cursor-pointer h-[60px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
                >
                  <ActionBoxItem
                    rate={calculateRate(bank)}
                    lendingMode={lendingMode}
                    bank={bank}
                    showBalanceOverride={true}
                    nativeSolBalance={nativeSolBalance}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {searchQuery.length > 0 && filteredBanksActiveBorrowing.length > 0 && (
            <CommandGroup heading="Currently supplying">
              {filteredBanksActiveBorrowing.slice(0, searchQuery.length === 0 ? 5 : 3).map((bank, index) => (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    setCurrentToken(
                      extendedBankInfos.find(
                        (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                      ) ?? null
                    );
                    setIsTokenPopoverOpen(false);
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white",
                    lendingMode === LendingModes.LEND && "py-2"
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
          {searchQuery.length > 0 && filteredBanksActiveLending.length > 0 && (
            <CommandGroup heading="Currently supplying">
              {filteredBanksActiveLending.slice(0, searchQuery.length === 0 ? 5 : 3).map((bank, index) => (
                <CommandItem
                  key={index}
                  value={bank.address?.toString().toLowerCase()}
                  onSelect={(currentValue) => {
                    setCurrentToken(
                      extendedBankInfos.find(
                        (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                      ) ?? null
                    );
                    setIsTokenPopoverOpen(false);
                  }}
                  className={cn(
                    "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white",
                    lendingMode === LendingModes.LEND && "py-2"
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
          {(searchQuery.length > 0 || lendingMode === LendingModes.BORROW || !connected) &&
            filteredBanks.length > 0 && (
              <CommandGroup heading="All tokens">
                {filteredBanks.slice(0, searchQuery.length === 0 ? 5 : 3).map((bank, index) => (
                  <CommandItem
                    key={index}
                    value={bank.address?.toString().toLowerCase()}
                    onSelect={(currentValue) => {
                      setCurrentToken(
                        extendedBankInfos.find(
                          (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                        ) ?? null
                      );
                      setIsTokenPopoverOpen(false);
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
                ))}
              </CommandGroup>
            )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

type ActionBoxItemProps = {
  rate: string;
  lendingMode: LendingModes;
  bank: ExtendedBankInfo;
  nativeSolBalance: number;
  showBalanceOverride: boolean;
};

const ActionBoxItem = ({ rate, lendingMode, bank, nativeSolBalance, showBalanceOverride }: ActionBoxItemProps) => {
  const balance = React.useMemo(() => {
    const isWSOL = bank.info.state.mint?.equals ? bank.info.state.mint.equals(WSOL_MINT) : false;

    return isWSOL ? bank.userInfo.tokenAccount.balance + nativeSolBalance : bank.userInfo.tokenAccount.balance;
  }, [bank, nativeSolBalance]);

  const balancePrice = React.useMemo(
    () =>
      balance * bank.info.state.price > 0.01
        ? usdFormatter.format(balance * bank.info.state.price)
        : `$${(balance * bank.info.state.price).toExponential(2)}`,
    [bank, balance]
  );

  return (
    <>
      <div className="flex items-center gap-3">
        {bank.meta.tokenLogoUri && (
          <Image
            src={bank.meta.tokenLogoUri}
            alt={bank.meta.tokenName}
            width={24}
            height={24}
            className="rounded-full"
          />
        )}
        <div>
          <p>{bank.meta.tokenSymbol}</p>
          <p
            className={cn(
              "text-sm",
              lendingMode === LendingModes.LEND && "text-success",
              lendingMode === LendingModes.BORROW && "text-error"
            )}
          >
            {rate}
          </p>
        </div>
      </div>

      {((lendingMode === LendingModes.BORROW && balance > 0) || showBalanceOverride) && (
        <div className="space-y-0.5 text-right">
          <p className="font-medium">{balance > 0.01 ? numeralFormatter(balance) : "< 0.01"}</p>
          <p className="text-sm text-muted-foreground">{balancePrice}</p>
        </div>
      )}
    </>
  );
};
