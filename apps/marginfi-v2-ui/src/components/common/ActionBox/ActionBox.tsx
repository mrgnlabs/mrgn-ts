import React from "react";

import Image from "next/image";

import { cn } from "~/utils";
import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { useMrgnlendStore, useUiStore } from "~/store";

import { MrgnLabeledSwitch } from "~/components/common/MrgnLabeledSwitch";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { IconChevronDown } from "~/components/ui/icons";

import { LendingModes } from "~/types";

import type { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

export const ActionBox = () => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const [lendingMode, setLendingMode] = useUiStore((state) => [state.lendingMode, state.setLendingMode]);
  const [isTokenPopoverOpen, setIsTokenPopoverOpen] = React.useState(false);
  const [currentToken, setCurrentToken] = React.useState<ExtendedBankInfo | null>(null);
  const [amount, setAmount] = React.useState<number | null>(null);

  return (
    <div className="bg-background p-4 flex flex-col items-center gap-4">
      <div className="space-y-6 text-center w-full flex flex-col items-center">
        <div className="flex w-[150px] h-[42px]">
          <MrgnLabeledSwitch
            labelLeft="Lend"
            labelRight="Borrow"
            checked={lendingMode === LendingModes.BORROW}
            onClick={() => {
              setLendingMode(lendingMode === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND);
            }}
          />
        </div>
        <p>Supply. Earn interest. Borrow. Repeat.</p>
      </div>
      <div className="p-6 bg-background-gray text-white w-full max-w-[480px] rounded-xl">
        <p className="text-lg mb-3">You {lendingMode === LendingModes.LEND ? "supply" : "borrow"}</p>
        <div className="bg-background text-3xl rounded-lg flex justify-between items-center p-4 font-medium mb-5">
          <Popover open={isTokenPopoverOpen} onOpenChange={(open) => setIsTokenPopoverOpen(open)}>
            <PopoverTrigger asChild>
              <Button
                className={cn(
                  "bg-background-gray text-white text-xl p-6 pr-5 gap-2.5 transition-colors hover:bg-background-gray-light",
                  isTokenPopoverOpen && "bg-background-gray-light"
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
            <PopoverContent className="p-2 w-[300px] max-h-96" align="start" side="bottom" sideOffset={10}>
              <Command>
                <CommandInput placeholder="Search token..." className="h-9 text-lg" />
                <CommandEmpty>No framework found.</CommandEmpty>
                <CommandGroup heading="In your wallet">
                  {extendedBankInfos.slice(0, 3).map((bankInfo, index) => (
                    <CommandItem
                      key={index}
                      value={bankInfo?.address?.toString().toLowerCase()}
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
                      {bankInfo.meta.tokenLogoUri && (
                        <Image
                          src={bankInfo.meta.tokenLogoUri}
                          alt={bankInfo.meta.tokenName}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      <span>{bankInfo.meta.tokenSymbol}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="All tokens">
                  {extendedBankInfos.slice(3, 6).map((bankInfo, index) => (
                    <CommandItem
                      key={index}
                      value={bankInfo?.address?.toString().toLowerCase()}
                      onSelect={(currentValue) => {
                        setCurrentToken(
                          extendedBankInfos.find(
                            (bankInfo) => bankInfo.address.toString().toLowerCase() === currentValue
                          ) ?? null
                        );
                      }}
                      className="text-lg py-2 font-medium flex gap-3"
                    >
                      {bankInfo.meta.tokenLogoUri && (
                        <Image
                          src={bankInfo.meta.tokenLogoUri}
                          alt={bankInfo.meta.tokenName}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      <span>{bankInfo.meta.tokenSymbol}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <Input
            type="number"
            value={amount!}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="0"
            className="bg-transparent w-full text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-3xl font-medium"
          />
        </div>
        <Button className="w-full py-6">Select token and amount</Button>
        {currentToken !== null && amount !== null && (
          <dl className="grid grid-cols-2 text-muted-foreground gap-y-2 mt-4 text-sm">
            <dt>Your deposited amount:</dt>
            <dd className="text-white font-medium text-right">
              {amount} {currentToken.meta.tokenSymbol}
            </dd>
            <dt>Liquidation price:</dt>
            <dd className="text-white font-medium text-right">{usdFormatter.format(amount)}</dd>
            <dt>Some property:</dt>
            <dd className="text-white font-medium text-right">--</dd>
            <dt>Some property:</dt>
            <dd className="text-white font-medium text-right">--</dd>
          </dl>
        )}
      </div>
    </div>
  );
};
