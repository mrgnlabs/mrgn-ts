import React from "react";

import Image from "next/image";

import { numeralFormatter, usdFormatter, percentFormatter, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore, useUiStore } from "~/store";

import { cn } from "~/utils";

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
  const [lendingMode, selectedToken, setSelectedToken] = useUiStore((state) => [
    state.lendingMode,
    state.selectedToken,
    state.setSelectedToken,
  ]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isTokenPopoverOpen, setIsTokenPopoverOpen] = React.useState(false);

  const filteredBanks = React.useMemo(() => {
    const lowerCaseSearchQuery = searchQuery.toLowerCase();

    return extendedBankInfos
      .filter((bankInfo) => {
        return bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery);
      })
      .filter((bankInfo) => {
        return lendingMode === LendingModes.LEND ? bankInfo.userInfo.tokenAccount.balance === 0 : true;
      });
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
        return b.userInfo.tokenAccount.balance - a.userInfo.tokenAccount.balance;
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
            "bg-background-gray-light text-white text-lg p-6 pr-5 gap-2.5 transition-colors hover:bg-background-gray",
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
              <span>{currentToken.meta.tokenSymbol}</span>
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
          value={selectedToken?.address?.toString().toLowerCase() ?? ""}
          onValueChange={(value) =>
            setSelectedToken(extendedBankInfos.find((bank) => bank.address.toString() === value) || null)
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
          {lendingMode === LendingModes.LEND && filteredBanksUserOwns.length > 0 && (
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
                  className="h-[60px] px-3 font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white"
                >
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
                      <p className="text-sm text-success">
                        {percentFormatter.format(
                          (lendingMode === LendingModes.LEND
                            ? bank.info.state.lendingRate
                            : bank.info.state.borrowingRate) +
                            (lendingMode === LendingModes.LEND && bank.info.state.emissions == Emissions.Lending
                              ? bank.info.state.emissionsRate
                              : 0) +
                            (lendingMode !== LendingModes.LEND && bank.info.state.emissions == Emissions.Borrowing
                              ? bank.info.state.emissionsRate
                              : 0)
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p className="font-medium">
                      {bank.userInfo.tokenAccount.balance > 0.01
                        ? numeralFormatter(bank.userInfo.tokenAccount.balance)
                        : "< 0.01"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {bank.userInfo.tokenAccount.balance * bank.info.state.price > 0.01
                        ? usdFormatter.format(bank.userInfo.tokenAccount.balance * bank.info.state.price)
                        : `$${(bank.userInfo.tokenAccount.balance * bank.info.state.price).toExponential(2)}`}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {(searchQuery.length > 0 || lendingMode === LendingModes.BORROW) && filteredBanks.length > 0 && (
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
                  }}
                  className={cn(
                    "font-medium flex items-center justify-between gap-2 data-[selected=true]:bg-background-gray-light data-[selected=true]:text-white",
                    lendingMode === LendingModes.LEND && "py-2",
                    lendingMode === LendingModes.BORROW && "h-[60px]"
                  )}
                >
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
                        {percentFormatter.format(
                          (lendingMode === LendingModes.LEND
                            ? bank.info.state.lendingRate
                            : bank.info.state.borrowingRate) +
                            (lendingMode === LendingModes.LEND && bank.info.state.emissions == Emissions.Lending
                              ? bank.info.state.emissionsRate
                              : 0) +
                            (lendingMode !== LendingModes.LEND && bank.info.state.emissions == Emissions.Borrowing
                              ? bank.info.state.emissionsRate
                              : 0)
                        )}
                      </p>
                    </div>
                  </div>

                  {lendingMode === LendingModes.BORROW && bank.userInfo.tokenAccount.balance > 0 && (
                    <div className="space-y-0.5 text-right">
                      <p className="font-medium">
                        {bank.userInfo.tokenAccount.balance > 0.01
                          ? numeralFormatter(bank.userInfo.tokenAccount.balance)
                          : "< 0.01"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {bank.userInfo.tokenAccount.balance * bank.info.state.price > 0.01
                          ? usdFormatter.format(bank.userInfo.tokenAccount.balance * bank.info.state.price)
                          : `$${(bank.userInfo.tokenAccount.balance * bank.info.state.price).toExponential(2)}`}
                      </p>
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};
