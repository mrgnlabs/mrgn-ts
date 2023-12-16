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

import { IconChevronDown, IconX } from "~/components/ui/icons";

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
      .filter((bankInfo) =>
        bankInfo.isActive
          ? lendingMode === LendingModes.LEND
            ? bankInfo.position?.isLending
            : !bankInfo.position?.isLending
          : true
      )
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

  const isActiveBank = React.useCallback(
    (pk: PublicKey) =>
      filteredBanksActiveBorrowing.find((activeBank) => activeBank.address === pk) ||
      filteredBanksActiveLending.find((activeBank) => activeBank.address === pk),
    [extendedBankInfos]
  );

  const filteredBanks = React.useMemo(() => {
    const lowerCaseSearchQuery = searchQuery.toLowerCase();

    return extendedBankInfos
      .filter((bankInfo) => bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery))
      .filter((bankInfo) => (lendingMode === LendingModes.LEND ? bankInfo.userInfo.tokenAccount.balance === 0 : true))
      .filter((bankInfo) => !isActiveBank(bankInfo.address));
  }, [extendedBankInfos, lendingMode, searchQuery]);

  const globalBanks = filteredBanks.filter((bank) => !bank.info.state.isIsolated);
  const isolatedBanks = filteredBanks.filter((bank) => bank.info.state.isIsolated);

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
                      <svg
                        data-name="Layer 1"
                        xmlns="http://www.w3.org/2000/svg"
                        width={80}
                        viewBox="0 0 1920 349.9"
                        className="fill-white"
                      >
                        <path d="m1790.4 287.5-72-165.4h48.2l49.2 118.6 56.8-118.6h47.4l-112 227.8h-48.3ZM1615 253.2a49.2 49.2 0 0 0 12.2-4.5 50.4 50.4 0 0 0 10.3-7.3 44.2 44.2 0 0 0 8-9.7 49.8 49.8 0 0 0 5.2-12.1 51.2 51.2 0 0 0 2-14.3 51.9 51.9 0 0 0-2-14.5 49.8 49.8 0 0 0-5.3-12.1 46 46 0 0 0-8-9.8 44.7 44.7 0 0 0-10.2-7.2 53.7 53.7 0 0 0-12.2-4.4 60 60 0 0 0-13.6-1.5 59 59 0 0 0-13.5 1.5 52.4 52.4 0 0 0-12 4.4 47 47 0 0 0-10.4 7.2 44.9 44.9 0 0 0-8 9.8 47.7 47.7 0 0 0-5.2 12.1 54 54 0 0 0-1.8 14.5 53.3 53.3 0 0 0 1.8 14.3 47.6 47.6 0 0 0 5.2 12 43.2 43.2 0 0 0 8 9.8 53.5 53.5 0 0 0 10.3 7.3 48.1 48.1 0 0 0 12 4.5 58.7 58.7 0 0 0 13.6 1.6 59.8 59.8 0 0 0 13.6-1.6m-48.7 37a87 87 0 0 1-21.1-8.4 80.7 80.7 0 0 1-30.9-31 88.2 88.2 0 0 1-8.5-21.3 101.8 101.8 0 0 1 0-48.7 86.8 86.8 0 0 1 8.5-21.2 81.2 81.2 0 0 1 30.9-30.9 87 87 0 0 1 21.1-8.4 96.3 96.3 0 0 1 24.2-3 105.1 105.1 0 0 1 13.2.8 80.4 80.4 0 0 1 11.9 2.4 89.2 89.2 0 0 1 10.6 3.8 67.2 67.2 0 0 1 9.3 4.8 49.4 49.4 0 0 1 7.9 6 62 62 0 0 1 6.2 7v-20h45.8v166.3h-45.8v-20a60.6 60.6 0 0 1-10 10 61.8 61.8 0 0 1-13.3 8 76 76 0 0 1-16.5 5 100.7 100.7 0 0 1-19.3 1.8 96.3 96.3 0 0 1-24.2-3m-166.3-126a74.2 74.2 0 0 0 19.5-2.2 35.4 35.4 0 0 0 13.6-6.8 27 27 0 0 0 8-11.2 43.3 43.3 0 0 0 2.5-15.5 42.7 42.7 0 0 0-2.6-15.4 26.5 26.5 0 0 0-8-11.1 36 36 0 0 0-13.5-6.7A74.3 74.3 0 0 0 1400 93h-45v71.2Zm-92.4-110.4h96.9q22.8 0 39.6 5.6t27.6 15.4a61.8 61.8 0 0 1 16.2 23.8 82.8 82.8 0 0 1 5.3 30 81.4 81.4 0 0 1-5.3 30 62.8 62.8 0 0 1-16.2 23.6q-10.9 10-27.6 15.6-16.8 5.6-39.6 5.6H1355v85h-47.4ZM1104 122h45.5v20a51.8 51.8 0 0 1 9.9-10.3 62.5 62.5 0 0 1 12.9-7.9 70.4 70.4 0 0 1 15.9-5 97.4 97.4 0 0 1 18.4-1.6 79 79 0 0 1 28.3 4.8 58.3 58.3 0 0 1 21.4 13.8 59.6 59.6 0 0 1 13.4 22.3 89.6 89.6 0 0 1 4.6 29.7v100.5H1229v-88.7a61.6 61.6 0 0 0-2.7-19.2 38.2 38.2 0 0 0-7.7-13.9 31.4 31.4 0 0 0-12.4-8.3 47 47 0 0 0-16.8-2.8 47.6 47.6 0 0 0-16.8 2.8 31.3 31.3 0 0 0-12.5 8.3 38.2 38.2 0 0 0-7.7 14 61.6 61.6 0 0 0-2.7 19v88.8H1104ZM992 252.8a57.4 57.4 0 0 0 12.5-4.7 42 42 0 0 0 10.3-7.4 47.7 47.7 0 0 0 7.8-9.9 44 44 0 0 0 4.8-12 58.5 58.5 0 0 0 1.6-13.8 57.5 57.5 0 0 0-1.6-13.9 45 45 0 0 0-12.6-21.8 47 47 0 0 0-10.3-7.5 50.5 50.5 0 0 0-12.5-4.7 63 63 0 0 0-14.4-1.6 62.2 62.2 0 0 0-14.3 1.6 49.1 49.1 0 0 0-12.5 4.7 47.7 47.7 0 0 0-10.2 7.5 41.5 41.5 0 0 0-7.6 9.9 54.4 54.4 0 0 0-4.8 11.9 52.2 52.2 0 0 0-1.7 13.9 53.4 53.4 0 0 0 1.7 13.8 51.9 51.9 0 0 0 4.8 12 43.6 43.6 0 0 0 7.6 10A42.5 42.5 0 0 0 951 248a55.6 55.6 0 0 0 12.5 4.7 59.4 59.4 0 0 0 14.3 1.6 60 60 0 0 0 14.4-1.6m-41.3 37.4a107.8 107.8 0 0 1-23.7-8.5 87.4 87.4 0 0 1-19.5-13.4 81.6 81.6 0 0 1-14.7-17.6 83.8 83.8 0 0 1-9.3-21.4 92.2 92.2 0 0 1 0-48.7 82.5 82.5 0 0 1 9.3-21.3 84.4 84.4 0 0 1 14.7-17.6 86 86 0 0 1 19.5-13.5 108 108 0 0 1 23.7-8.5 121.5 121.5 0 0 1 54 0 104.8 104.8 0 0 1 23.6 8.5 91 91 0 0 1 19.5 13.5 84 84 0 0 1 15 17.6 81 81 0 0 1 9.4 21.3 92.2 92.2 0 0 1 0 48.7 82.3 82.3 0 0 1-9.5 21.4 81.3 81.3 0 0 1-14.9 17.6 92.6 92.6 0 0 1-19.5 13.4 104.8 104.8 0 0 1-23.5 8.5 121.9 121.9 0 0 1-54 0m-177.6-37.4a57.3 57.3 0 0 0 12.5-4.7 42 42 0 0 0 10.3-7.4 47.7 47.7 0 0 0 7.8-9.9 44 44 0 0 0 4.8-12 58.5 58.5 0 0 0 1.6-13.8 57.5 57.5 0 0 0-1.6-13.9 45 45 0 0 0-12.6-21.8 47 47 0 0 0-10.3-7.5 50.5 50.5 0 0 0-12.5-4.7 63 63 0 0 0-14.4-1.6 62.2 62.2 0 0 0-14.3 1.6 49.1 49.1 0 0 0-12.5 4.7 47.8 47.8 0 0 0-10.2 7.5 41.5 41.5 0 0 0-7.6 9.9 54.6 54.6 0 0 0-4.8 11.9 52.2 52.2 0 0 0-1.7 13.9 53.4 53.4 0 0 0 1.7 13.8 52 52 0 0 0 4.8 12 43.6 43.6 0 0 0 7.6 10 42.5 42.5 0 0 0 10.2 7.3 55.6 55.6 0 0 0 12.5 4.7 59.4 59.4 0 0 0 14.3 1.6 60 60 0 0 0 14.4-1.6M732 290.2a107.8 107.8 0 0 1-23.7-8.5 87.4 87.4 0 0 1-19.5-13.4 81.7 81.7 0 0 1-14.7-17.6 83.8 83.8 0 0 1-9.3-21.4 92.2 92.2 0 0 1 0-48.7 82.5 82.5 0 0 1 9.3-21.3 84.4 84.4 0 0 1 14.7-17.6 86 86 0 0 1 19.5-13.5 108 108 0 0 1 23.7-8.5 121.5 121.5 0 0 1 54 0 104.7 104.7 0 0 1 23.5 8.5 91 91 0 0 1 19.6 13.5 84 84 0 0 1 15 17.6 81 81 0 0 1 9.3 21.3 92.2 92.2 0 0 1 0 48.7 82.2 82.2 0 0 1-9.4 21.4 81.3 81.3 0 0 1-14.9 17.6 92.5 92.5 0 0 1-19.6 13.4 104.8 104.8 0 0 1-23.4 8.5 121.9 121.9 0 0 1-54 0M372.8 53.8h48l81.8 125.1L585 53.8h48v234.6h-47.5V127.5l-68 103.8h-29l-68-103.8v161h-47.5ZM263.6 95.8a47.9 47.9 0 1 0-47.9-48 47.9 47.9 0 0 0 47.9 48M116.7 311.5a116.7 116.7 0 1 1 116.8-116.8 116.7 116.7 0 0 1-116.8 116.8" />
                      </svg>
                    </>
                  </Button>
                </>
              )}
              <button onClick={() => setIsTokenPopoverOpen(false)} className="absolute top-2.5 right-2">
                <IconX size={18} className="text-white/50" />
              </button>
              <CommandEmpty>No tokens found.</CommandEmpty>

              <div className="max-h-[420px] overflow-auto">
                {lendingMode === LendingModes.LEND &&
                  connected &&
                  filteredBanksUserOwns.length > 0 &&
                  actionMode !== ActionType.Withdraw &&
                  actionMode !== ActionType.Repay && (
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
                {(searchQuery.length > 0 || actionMode === ActionType.Repay) &&
                  filteredBanksActiveBorrowing.length > 0 &&
                  lendingMode === LendingModes.BORROW && (
                    <CommandGroup heading="Currently borrowing">
                      {filteredBanksActiveBorrowing.map((bank, index) => (
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
                          className="cursor-pointer font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
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
                {(searchQuery.length > 0 || actionMode === ActionType.Withdraw) &&
                  filteredBanksActiveLending.length > 0 &&
                  lendingMode === LendingModes.LEND && (
                    <CommandGroup heading="Currently supplying">
                      {filteredBanksActiveLending.map((bank, index) => (
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
                {globalBanks.length > 0 && actionMode !== ActionType.Withdraw && actionMode !== ActionType.Repay && (
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
                {isolatedBanks.length > 0 && actionMode !== ActionType.Withdraw && actionMode !== ActionType.Repay && (
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
