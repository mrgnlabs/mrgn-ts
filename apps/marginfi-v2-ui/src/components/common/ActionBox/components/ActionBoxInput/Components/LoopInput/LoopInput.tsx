import React from "react";

import Image from "next/image";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatter } from "@mrgnlabs/mrgn-common";

import { useActionBoxStore } from "~/hooks/useActionBoxStore";
import { computeBankRateRaw, getMaintHealthColor, getTokenImageURL } from "~/utils";

import { ActionBoxTokens } from "~/components/common/ActionBox/components";
import { InputAction } from "~/components/common/ActionBox/components/ActionBoxInput/Components/InputAction";
import { Input } from "~/components/ui/input";
import { Slider } from "~/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { IconChevronDown } from "~/components/ui/icons";
import { cn } from "~/utils";

import { LendingModes } from "~/types";

type LoopInputProps = {
  walletAmount: number | undefined;
  maxAmount: number;
  handleInputChange: (value: string) => void;
  handleInputFocus: (focus: boolean) => void;
  isDialog?: boolean;
};

export const LoopInput = ({
  walletAmount,
  maxAmount,
  isDialog,
  handleInputChange,
  handleInputFocus,
}: LoopInputProps) => {
  const amountInputRef = React.useRef<HTMLInputElement>(null);
  const [
    setSelectedBank,
    setRepayBank,
    setSelectedStakingAccount,
    setLeverage,
    leverage,
    maxLeverage,
    selectedBank,
    selectedRepayBank,
    amountRaw,
  ] = useActionBoxStore(isDialog)((state) => [
    state.setSelectedBank,
    state.setRepayBank,
    state.setSelectedStakingAccount,
    state.setLeverage,
    state.leverage,
    state.maxLeverage,
    state.selectedBank,
    state.selectedRepayBank,
    state.amountRaw,
  ]);

  const [netApyRaw, setNetApyRaw] = React.useState(0);

  const netApy = React.useMemo(() => {
    if (!selectedBank || !selectedRepayBank) return 0;
    const depositTokenApy = computeBankRateRaw(selectedBank, LendingModes.LEND);
    const borrowTokenApy = computeBankRateRaw(selectedRepayBank, LendingModes.BORROW);
    const netApy = depositTokenApy - borrowTokenApy;

    setNetApyRaw(netApy);
    return percentFormatter.format(Math.abs(netApy));
  }, [selectedBank, selectedRepayBank]);

  const bothBanksSelected = selectedBank && selectedRepayBank;

  return (
    <div>
      <div className="bg-background rounded-lg p-2.5 mb-6">
        <div className="flex justify-center gap-1 items-center font-medium text-3xl">
          <div className="w-full flex-auto max-w-[162px]">
            <ActionBoxTokens
              actionModeOverride={ActionType.Deposit}
              setRepayTokenBank={(tokenBank) => {
                setRepayBank(tokenBank);
              }}
              setTokenBank={(tokenBank) => {
                if (selectedRepayBank) {
                  setRepayBank(null);
                  setLeverage(0);
                }
                setSelectedBank(tokenBank);
              }}
              setStakingAccount={(account) => {
                setSelectedStakingAccount(account);
              }}
              setLoopBank={(account) => {
                setRepayBank(account);
              }}
            />
          </div>
          <div className="flex-auto">
            <Input
              type="text"
              ref={amountInputRef}
              inputMode="decimal"
              value={amountRaw}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => handleInputFocus(true)}
              onBlur={() => handleInputFocus(false)}
              placeholder="0"
              className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
            />
          </div>
        </div>
        <InputAction
          walletAmount={walletAmount}
          maxAmount={maxAmount}
          onSetAmountRaw={(amount) => handleInputChange(amount)}
        />
      </div>
      <div className={cn("space-y-2", !selectedBank && "pointer-events-none opacity-75")}>
        <p className="text-sm font-normal text-muted-foreground">You borrow</p>
        <div className="bg-background rounded-lg p-2.5 mb-6">
          <div className="flex gap-1 items-center font-medium text-3xl">
            <div className={cn("w-full flex-auto max-w-[162px]", !selectedBank && "opacity-60")}>
              <ActionBoxTokens
                actionModeOverride={ActionType.Borrow}
                setRepayTokenBank={(tokenBank) => {
                  setRepayBank(tokenBank);
                }}
                setTokenBank={(tokenBank) => {
                  setSelectedBank(tokenBank);
                }}
                setStakingAccount={(account) => {
                  setSelectedStakingAccount(account);
                }}
                setLoopBank={(account) => {
                  setRepayBank(account);
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className={cn("space-y-6 py-4 px-1", !bothBanksSelected && "pointer-events-none cursor-default opacity-50")}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal text-muted-foreground">Loop ➰</p>
            <span className="flex items-center gap-1">
              {leverage > 1 && (
                <span className="text-muted-foreground text-sm">
                  {leverage}x leverage{leverage === maxLeverage && " (max)"}
                </span>
              )}
            </span>
          </div>
          <Slider
            defaultValue={[1]}
            max={10}
            min={1}
            step={1}
            value={[leverage]}
            onValueChange={(value) => {
              if (value[0] > maxLeverage) return;
              setLeverage(value[0]);
            }}
            disabled={!bothBanksSelected}
          />
        </div>
        <div className="flex items-center justify-between">
          <Popover>
            <PopoverTrigger className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
              Net APY <IconChevronDown size={16} />
            </PopoverTrigger>
            <PopoverContent align="center" className="w-auto">
              {bothBanksSelected && (
                <ul className="space-y-2.5">
                  {[selectedBank, selectedRepayBank].map((bank, index) => {
                    const isDepositBank = index === 0;
                    return (
                      <li key={bank.meta.tokenSymbol} className="flex items-center gap-8 justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTokenImageURL(bank.meta.tokenSymbol)}
                            width={20}
                            height={20}
                            alt={bank.meta.tokenName}
                            className="rounded-full"
                          />
                          <strong className="font-medium">{bank.meta.tokenSymbol}</strong>
                        </div>
                        <span className={cn("ml-auto", isDepositBank ? "text-success" : "text-warning")}>
                          {percentFormatter.format(
                            computeBankRateRaw(bank, isDepositBank ? LendingModes.LEND : LendingModes.BORROW)
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PopoverContent>
          </Popover>
          {bothBanksSelected && (
            <span className={cn("text-xs", netApyRaw < 0 ? "text-warning" : "text-success")}>{netApy} APY</span>
          )}
        </div>
      </div>
    </div>
  );
};
