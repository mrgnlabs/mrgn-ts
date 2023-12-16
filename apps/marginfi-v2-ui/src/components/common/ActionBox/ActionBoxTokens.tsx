import React from "react";

import Image from "next/image";

import { numeralFormatter, usdFormatter, percentFormatter, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, Emissions, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore, useUiStore } from "~/store";

import { cn } from "~/utils";

import { useWalletContext } from "~/hooks/useWalletContext";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Button } from "~/components/ui/button";

import { IconChevronDown, IconMoonPay, IconX } from "~/components/ui/icons";

import { LendingModes } from "~/types";
import { PublicKey } from "@solana/web3.js";

type ActionBoxTokensProps = {
  currentTokenBank: PublicKey | null;
  setCurrentTokenBank: (selectedTokenBank: PublicKey | null) => void;
  actionMode: ActionType;
  isDialog?: boolean;
};

export const ActionBoxTokens = ({
  currentTokenBank,
  isDialog,
  actionMode,
  setCurrentTokenBank,
}: ActionBoxTokensProps) => {
  const [extendedBankInfos, nativeSolBalance] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
  ]);
  const [lendingMode, setIsWalletOpen] = useUiStore((state) => [state.lendingMode, state.setIsWalletOpen]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isTokenPopoverOpen, setIsTokenPopoverOpen] = React.useState(false);
  const { connected } = useWalletContext();

  const selectedBank = React.useMemo(
    () =>
      currentTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(currentTokenBank))
        : null,
    [extendedBankInfos, currentTokenBank]
  );

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

  const hasTokens = React.useMemo(() => {
    const hasBankTokens = !!extendedBankInfos.filter(
      (bank) => bank.userInfo.tokenAccount.balance !== 0 || bank.meta.tokenSymbol === "SOL"
    );

    return hasBankTokens;
  }, [extendedBankInfos, nativeSolBalance]);

  /////// FILTERS

  // filter on balance
  const balanceFilter = (bankInfo: ExtendedBankInfo) => {
    const isWSOL = bankInfo.info.state.mint?.equals ? bankInfo.info.state.mint.equals(WSOL_MINT) : false;
    const balance = isWSOL
      ? bankInfo.userInfo.tokenAccount.balance + nativeSolBalance
      : bankInfo.userInfo.tokenAccount.balance;
    return balance > 0;
  };

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
      bankInfo.isActive
        ? lendingMode === LendingModes.LEND
          ? bankInfo.position?.isLending
          : !bankInfo.position?.isLending
        : filterActive,
    [lendingMode]
  );

  /////// BANKS

  // wallet banks
  const filteredBanksUserOwns = React.useMemo(() => {
    return extendedBankInfos
      .filter(balanceFilter)
      .filter(searchFilter)
      .filter((bank) => positionFilter(bank, true))
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
  }, [extendedBankInfos, searchFilter, positionFilter]);

  const ownedBanksPk = React.useMemo(() => filteredBanksUserOwns.map((bank) => bank.address), [filteredBanksUserOwns]);

  // active position banks
  const filteredBanksActive = React.useMemo(() => {
    return extendedBankInfos
      .filter(searchFilter)
      .filter((bankInfo) => positionFilter(bankInfo, false))
      .sort((a, b) => (b.isActive ? b?.position?.amount : 0) - (a.isActive ? a?.position?.amount : 0));
  }, [extendedBankInfos, searchFilter, positionFilter]);

  const hasExistingBorrow = React.useMemo(
    () => filteredBanksActive.some((bank) => bank.isActive && !bank.position.isLending),
    [filteredBanksActive]
  );
  const hasIsolatedBorrow = React.useMemo(
    () => filteredBanksActive.some((bank) => bank.isActive && !bank.position.isLending && bank.info.state.isIsolated),
    [filteredBanksActive]
  );

  // other banks without positions
  const filteredBanks = React.useMemo(() => {
    return extendedBankInfos
      .filter(searchFilter)
      .filter((bankInfo) => (lendingMode === LendingModes.LEND ? bankInfo.userInfo.tokenAccount.balance === 0 : true))
      .filter((bankInfo) => positionFilter(bankInfo, true));
  }, [extendedBankInfos, lendingMode, positionFilter, searchFilter]);

  const globalBanks = React.useMemo(() => filteredBanks.filter((bank) => !bank.info.state.isIsolated), [filteredBanks]);
  const isolatedBanks = React.useMemo(
    () => filteredBanks.filter((bank) => bank.info.state.isIsolated),
    [filteredBanks]
  );

  React.useEffect(() => {
    if (!isTokenPopoverOpen) {
      setSearchQuery("");
    }
  }, [isTokenPopoverOpen]);

  return (
    <>
      {isDialog ? (
        <div className="flex gap-3 w-[300px] items-center">
          {selectedBank && (
            <SelectedBankItem bank={selectedBank} lendingMode={lendingMode} rate={calculateRate(selectedBank)} />
          )}
        </div>
      ) : (
        <Popover open={isTokenPopoverOpen} onOpenChange={(open) => setIsTokenPopoverOpen(open)}>
          <PopoverTrigger asChild>
            <Button
              className={cn(
                "bg-background-gray-light text-white text-left text-base p-6 pr-5 gap-2.5 transition-colors hover:bg-background-gray",
                isTokenPopoverOpen && "bg-background-gray md:w-[300px]"
              )}
            >
              {selectedBank && (
                <SelectedBankItem bank={selectedBank} lendingMode={lendingMode} rate={calculateRate(selectedBank)} />
              )}
              {!selectedBank && <>Select token</>}
              <IconChevronDown className="shrink-0 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-1 md:w-[320px] bg-background-gray"
            align="start"
            side="bottom"
            sideOffset={-50}
            avoidCollisions={false}
          >
            <Command
              className="bg-background-gray relative"
              shouldFilter={false}
              value={selectedBank?.address?.toString().toLowerCase() ?? ""}
              onValueChange={(value) =>
                setCurrentTokenBank(
                  extendedBankInfos.find((bank) => bank.address.toString() === value)?.address ||
                    selectedBank?.address ||
                    null
                )
              }
            >
              <CommandInput
                placeholder="Search token..."
                className="h-12"
                autoFocus={false}
                onValueChange={(value) => setSearchQuery(value)}
              />
              {!hasTokens && (
                <>
                  <div className="text-sm text-[#C0BFBF] font-normal p-3">
                    You don&apos;t own any supported tokens in marginfi. Check out what marginfi supports.
                  </div>
                  <Button variant="outline" className="w-fit mx-auto mb-3" onClick={() => setIsWalletOpen(true)}>
                    <>
                      Buy with
                      <IconMoonPay />
                    </>
                  </Button>
                </>
              )}
              <button onClick={() => setIsTokenPopoverOpen(false)} className="absolute top-2.5 right-2">
                <IconX size={18} className="text-white/50" />
              </button>
              <CommandEmpty>No tokens found.</CommandEmpty>

              {/* LENDING */}
              <div className="max-h-[420px] overflow-auto">
                {lendingMode === LendingModes.LEND && connected && filteredBanksUserOwns.length > 0 && (
                  <CommandGroup heading="Available in your wallet">
                    {filteredBanksUserOwns
                      .slice(0, searchQuery.length === 0 ? filteredBanksUserOwns.length : 3)
                      .map((bank, index) => {
                        return (
                          <CommandItem
                            key={index}
                            value={bank?.address?.toString().toLowerCase()}
                            onSelect={(currentValue) => {
                              setCurrentTokenBank(
                                extendedBankInfos.find(
                                  (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                                )?.address ?? null
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
                        );
                      })}
                  </CommandGroup>
                )}
                {lendingMode === LendingModes.LEND && filteredBanksActive.length > 0 && (
                  <CommandGroup heading="Currently supplying">
                    {filteredBanksActive.map((bank, index) => (
                      <CommandItem
                        key={index}
                        value={bank.address?.toString().toLowerCase()}
                        disabled={!ownedBanksPk.includes(bank.address)}
                        onSelect={(currentValue) => {
                          setCurrentTokenBank(
                            extendedBankInfos.find(
                              (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                            )?.address ?? null
                          );
                          setIsTokenPopoverOpen(false);
                        }}
                        className={cn(
                          "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white py-2",
                          !ownedBanksPk.includes(bank.address) && "pointer-events-none bg-muted opacity-60"
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
                {lendingMode === LendingModes.BORROW && filteredBanksActive.length > 0 && (
                  <CommandGroup heading="Currently borrowing">
                    {filteredBanksActive.map((bank, index) => (
                      <CommandItem
                        key={index}
                        value={bank.address?.toString().toLowerCase()}
                        onSelect={(currentValue) => {
                          setCurrentTokenBank(
                            extendedBankInfos.find(
                              (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                            )?.address ?? null
                          );
                          setIsTokenPopoverOpen(false);
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
                {globalBanks.length > 0 && (
                  <CommandGroup heading="Global pools">
                    {globalBanks.map((bank, index) => {
                      return (
                        <CommandItem
                          key={index}
                          value={bank.address?.toString().toLowerCase()}
                          onSelect={(currentValue) => {
                            setCurrentTokenBank(
                              extendedBankInfos.find(
                                (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                              )?.address ?? null
                            );
                            setIsTokenPopoverOpen(false);
                          }}
                          className={cn(
                            "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white",
                            lendingMode === LendingModes.LEND && "py-2",
                            lendingMode === LendingModes.LEND &&
                              !ownedBanksPk.includes(bank.address) &&
                              "pointer-events-none bg-muted opacity-60",
                            lendingMode === LendingModes.BORROW && "h-[60px]",
                            hasIsolatedBorrow && "pointer-events-none bg-muted opacity-60"
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
                {isolatedBanks.length > 0 && (
                  <CommandGroup heading="Isolated pools">
                    {isolatedBanks.map((bank, index) => {
                      return (
                        <CommandItem
                          key={index}
                          value={bank.address?.toString().toLowerCase()}
                          onSelect={(currentValue) => {
                            setCurrentTokenBank(
                              extendedBankInfos.find(
                                (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                              )?.address ?? null
                            );
                            setIsTokenPopoverOpen(false);
                          }}
                          className={cn(
                            "cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white",
                            lendingMode === LendingModes.LEND && "py-2",
                            lendingMode === LendingModes.LEND &&
                              !ownedBanksPk.includes(bank.address) &&
                              "pointer-events-none bg-muted opacity-60",
                            lendingMode === LendingModes.BORROW && "h-[60px]",
                            hasExistingBorrow && "pointer-events-none bg-muted opacity-60"
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
              </div>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
};

type SelectedBankItemProps = {
  bank: ExtendedBankInfo;
  lendingMode: LendingModes;
  rate: string;
};

const SelectedBankItem = ({ rate, bank, lendingMode }: SelectedBankItemProps) => {
  return (
    <>
      <Image src={bank.meta.tokenLogoUri!} alt={bank.meta.tokenName} width={28} height={28} className="rounded-full" />
      <div className="flex flex-col gap-1">
        <p className="leading-none text-base">{bank.meta.tokenSymbol}</p>
        <p
          className={cn(
            "text-sm font-normal leading-none",
            lendingMode === LendingModes.LEND && "text-success",
            lendingMode === LendingModes.BORROW && "text-error"
          )}
        >
          {rate + ` ${lendingMode === LendingModes.LEND ? "APY" : "APR"}`}
        </p>
      </div>
    </>
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
