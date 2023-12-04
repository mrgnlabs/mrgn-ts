import React from "react";

import Image from "next/image";

import { useMrgnlendStore, useUiStore } from "~/store";

import { cn } from "~/utils";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Button } from "~/components/ui/button";

import { IconChevronDown, IconX } from "~/components/ui/icons";

import { LendingModes } from "~/types";
import type { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

type ActionBoxTokensProps = {
  currentToken: ExtendedBankInfo | null;
  setCurrentToken: React.Dispatch<React.SetStateAction<ExtendedBankInfo | null>>;
};

export const ActionBoxTokens = ({ currentToken, setCurrentToken }: ActionBoxTokensProps) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isTokenPopoverOpen, setIsTokenPopoverOpen] = React.useState(false);

  const filteredBanks = React.useMemo(() => {
    const lowerCaseSearchQuery = searchQuery.toLowerCase();

    return extendedBankInfos.filter((bankInfo) => {
      return (
        bankInfo.userInfo.tokenAccount.balance === 0 &&
        bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery)
      );
    });
  }, [extendedBankInfos, searchQuery]);

  const filteredBanksUserOwns = React.useMemo(() => {
    const lowerCaseSearchQuery = searchQuery.toLowerCase();

    return extendedBankInfos.filter((bankInfo) => {
      return (
        bankInfo.userInfo.tokenAccount.balance > 0 &&
        bankInfo.meta.tokenSymbol.toLowerCase().includes(lowerCaseSearchQuery)
      );
    });
  }, [extendedBankInfos, searchQuery]);

  return (
    <Popover open={isTokenPopoverOpen} onOpenChange={(open) => setIsTokenPopoverOpen(open)}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "bg-background-gray-light text-white text-xl p-6 pr-5 gap-2.5 transition-colors hover:bg-background-gray",
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
        className="p-2 w-[320px] max-h-96 bg-background-gray"
        align="start"
        side="bottom"
        sideOffset={-50}
      >
        <Command className="bg-background-gray relative" shouldFilter={false}>
          <CommandInput
            placeholder="Search token..."
            className="h-9"
            onValueChange={(value) => setSearchQuery(value)}
          />
          <button onClick={() => setIsTokenPopoverOpen(false)} className="absolute top-2.5 right-2">
            <IconX size={18} className="text-white/50" />
          </button>
          <CommandEmpty>No tokens found.</CommandEmpty>
          {filteredBanksUserOwns.length > 0 && (
            <CommandGroup heading="In your wallet">
              {filteredBanksUserOwns.slice(0, searchQuery.length === 0 ? 8 : 3).map((bank, index) => (
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
                  className="text-lg py-2 font-medium flex gap-3"
                >
                  {bank.meta.tokenLogoUri && (
                    <Image
                      src={bank.meta.tokenLogoUri}
                      alt={bank.meta.tokenName}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  <span>{bank.meta.tokenSymbol}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {(searchQuery.length > 0 || lendingMode === LendingModes.BORROW) && filteredBanks.length > 0 && (
            <CommandGroup heading="All tokens">
              {filteredBanks.slice(0, 3).map((bank, index) => (
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
                  className="text-lg py-2 font-medium flex gap-3"
                >
                  {bank.meta.tokenLogoUri && (
                    <Image
                      src={bank.meta.tokenLogoUri}
                      alt={bank.meta.tokenName}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  <span>{bank.meta.tokenSymbol}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};
