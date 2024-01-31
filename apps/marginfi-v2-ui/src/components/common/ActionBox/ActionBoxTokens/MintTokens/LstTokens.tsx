import React from "react";

import { PublicKey } from "@solana/web3.js";

import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useLstStore, useMrgnlendStore, useUiStore } from "~/store";
import { SOL_MINT } from "~/store/lstStore";
import { cn } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Button } from "~/components/ui/button";
import { IconChevronDown, IconMoonPay, IconX } from "~/components/ui/icons";

import { ActionBoxItem, SelectedBankItem } from "../SharedComponents";
import { ActionBoxNativeItem } from "./ActionBoxNativeItem";
import { SelectedNativeItem } from "./SelectedNativeItem";

type LstTokensProps = {
  currentTokenBank: PublicKey | null;
  setCurrentTokenBank: (selectedTokenBank: PublicKey | null) => void;
  hasDropdown?: boolean;
};

export const LstTokens = ({ currentTokenBank, hasDropdown, setCurrentTokenBank }: LstTokensProps) => {
  const [extendedBankInfos, nativeSolBalance] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.nativeSolBalance,
  ]);
  const [stakeAccounts] = useLstStore((state) => [state.stakeAccounts]);
  const [setIsWalletOpen] = useUiStore((state) => [state.setIsWalletOpen]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isTokenPopoverOpen, setIsTokenPopoverOpen] = React.useState(false);
  const { connected } = useWalletContext();

  const selectedStakeAccount = React.useMemo(
    () => (currentTokenBank && stakeAccounts.find((value) => value.address.equals(currentTokenBank))) ?? null,
    [currentTokenBank, stakeAccounts]
  );

  const solUsdValue = React.useMemo(() => {
    const bank = extendedBankInfos.find((bank) => bank.info.state.mint.equals(SOL_MINT));
    return bank ? getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber() : 0;
  }, [extendedBankInfos]);

  const selectedBank = React.useMemo(
    () =>
      currentTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(currentTokenBank))
        : null,
    [extendedBankInfos, currentTokenBank]
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

  React.useEffect(() => {
    if (!isTokenPopoverOpen) {
      setSearchQuery("");
    }
  }, [isTokenPopoverOpen]);

  return (
    <>
      {!hasDropdown ? (
        <div className="flex gap-3 w-full items-center">{selectedBank && <SelectedBankItem bank={selectedBank} />}</div>
      ) : (
        <Popover open={isTokenPopoverOpen} onOpenChange={(open) => setIsTokenPopoverOpen(open)}>
          <PopoverTrigger asChild>
            <Button
              className={cn(
                "bg-background-gray-light text-white w-full font-normal text-left text-base items-center justify-start py-6 px-3 gap-2.5 transition-colors hover:bg-background-gray",
                "xs:pr-2.5 xs:pl-3.5 xs:py-6 xs:justify-center",
                isTokenPopoverOpen && "bg-background-gray"
              )}
            >
              {selectedStakeAccount ? (
                <SelectedNativeItem stakeData={selectedStakeAccount} />
              ) : (
                <>{selectedBank ? <SelectedBankItem bank={selectedBank} /> : <>Select token</>}</>
              )}
              <IconChevronDown className="shrink-0 ml-2" size={20} />
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

              {/* Active staking positions*/}
              <div className="max-h-[calc(100vh-580px)] overflow-auto">
                {connected && stakeAccounts.length > 0 && (
                  <CommandGroup heading="Natively staked">
                    {stakeAccounts.map((stakeAcc, index) => {
                      return (
                        <CommandItem
                          key={index}
                          value={stakeAcc?.address?.toBase58().toLowerCase()}
                          onSelect={(currentValue) => {
                            setCurrentTokenBank(
                              stakeAcc.address
                              // extendedBankInfos.find(
                              //   (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                              // )?.address ?? null
                            );
                            setIsTokenPopoverOpen(false);
                          }}
                          className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
                        >
                          <ActionBoxNativeItem stakeData={stakeAcc} nativeSolPrice={solUsdValue} />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </div>
              {/* LST token staking */}
              <div className="max-h-[calc(100vh-580px)] min-h-[200px] overflow-auto">
                {connected && filteredBanksUserOwns.length > 0 && (
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
                            className="cursor-pointer h-[55px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
                          >
                            <ActionBoxItem bank={bank} showBalanceOverride={true} nativeSolBalance={nativeSolBalance} />
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
