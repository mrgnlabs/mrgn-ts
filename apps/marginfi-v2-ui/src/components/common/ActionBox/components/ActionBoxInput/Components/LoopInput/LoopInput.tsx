import React from "react";

import BigNumber from "bignumber.js";
import Image from "next/image";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatter } from "@mrgnlabs/mrgn-common";

import { useActionBoxStore } from "~/hooks/useActionBoxStore";
import { computeBankRateRaw, formatAmount, getTokenImageURL } from "~/utils";

import { ActionBoxTokens } from "~/components/common/ActionBox/components";
import { InputAction } from "~/components/common/ActionBox/components/ActionBoxInput/Components/InputAction";
import { Input } from "~/components/ui/input";
import { useConnection } from "~/hooks/useConnection";
import { Slider } from "~/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { IconChevronDown } from "~/components/ui/icons";
import { cn } from "~/utils";

import { LendingModes } from "~/types";
import { useMrgnlendStore } from "~/store";
import { useDebounce } from "~/hooks/useDebounce";

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
  const [selectedAccount] = useMrgnlendStore((state) => [state.selectedAccount]);
  const { connection } = useConnection();
  const [
    setSelectedBank,
    setRepayBank,
    setSelectedStakingAccount,
    setLeverage,
    setLooping,
    actionTxn,

    loopingAmounts,
    leverage,
    maxLeverage,
    selectedBank,
    selectedRepayBank,
    amountRaw,
    isLoading,
  ] = useActionBoxStore(isDialog)((state) => [
    state.setSelectedBank,
    state.setRepayBank,
    state.setSelectedStakingAccount,
    state.setLeverage,
    state.setLooping,
    state.actionTxn,
    state.loopingAmounts,
    state.leverage,
    state.maxLeverage,
    state.selectedBank,
    state.selectedRepayBank,
    state.amountRaw,
    state.isLoading,
  ]);
  const [inputAmount, setInputAmount] = React.useState<string>("");
  const [leverageAmount, setLeverageAmount] = React.useState<number>(0);
  const debouncedAmount = useDebounce(inputAmount, 1000);

  const debouncedLeverage = useDebounce(leverageAmount, 1000);

  const [netApyRaw, setNetApyRaw] = React.useState(0);

  React.useEffect(() => handleInputChange(debouncedAmount), [debouncedAmount, handleInputChange]);
  React.useEffect(
    () => setLeverage(debouncedLeverage, selectedAccount, connection),
    [debouncedLeverage, selectedAccount, connection, setLeverage]
  );

  React.useEffect(() => setLeverageAmount(leverage), [leverage]);
  React.useEffect(() => {
    setInputAmount(amountRaw);
  }, [amountRaw]);

  const refreshTxn = React.useCallback(() => {
    if (selectedAccount) setLooping({ marginfiAccount: selectedAccount, connection: connection });
  }, [connection, selectedAccount, setLooping]);

  React.useEffect(() => {
    const blockhash = actionTxn?.message.recentBlockhash;

    const checkBlockhashValidity = () => {
      if (blockhash) {
        connection.isBlockhashValid(blockhash).then((value) => {
          if (!value) refreshTxn();
        });
      }
    };

    checkBlockhashValidity();

    const interval = setInterval(checkBlockhashValidity, 10000);

    return () => clearInterval(interval);
  }, [refreshTxn, actionTxn, connection]);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const netApy = React.useMemo(() => {
    if (!selectedBank || !selectedRepayBank) return 0;
    const depositTokenApy = computeBankRateRaw(selectedBank, LendingModes.LEND);
    const borrowTokenApy = computeBankRateRaw(selectedRepayBank, LendingModes.BORROW);
    const netApy = depositTokenApy - borrowTokenApy;

    setNetApyRaw(netApy);
    return percentFormatter.format(Math.abs(netApy));
  }, [selectedBank, selectedRepayBank]);

  const formatAmountCb = React.useCallback(
    (newAmount: string, bank: ExtendedBankInfo | null) => {
      setInputAmount(formatAmount(newAmount, maxAmount, bank, numberFormater));
    },
    [maxAmount, numberFormater]
  );

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
                setInputAmount("0");
                if (selectedRepayBank) {
                  setRepayBank(null);
                  setLeverageAmount(0);
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
              value={inputAmount}
              onChange={(e) => formatAmountCb(e.target.value, selectedBank)}
              onFocus={() => handleInputFocus(true)}
              onBlur={() => handleInputFocus(false)}
              disabled={isLoading || !bothBanksSelected}
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
            <div className="flex-auto">
              <Input
                type="text"
                inputMode="decimal"
                disabled={true}
                value={loopingAmounts.borrowAmount.decimalPlaces(4, BigNumber.ROUND_DOWN).toString()}
                placeholder="0"
                className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
              />
            </div>
          </div>
        </div>
      </div>
      <div className={cn("space-y-6 py-4 px-1", !bothBanksSelected && "pointer-events-none cursor-default opacity-50")}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal text-muted-foreground">Loop ➰</p>
          </div>
          <Slider
            defaultValue={[1]}
            max={maxLeverage === 0 ? 1 : maxLeverage}
            min={1}
            step={0.01}
            value={[leverageAmount]}
            onValueChange={(value) => {
              if (value[0] > maxLeverage) return;
              setLeverageAmount(value[0]);
            }}
            disabled={!bothBanksSelected}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal text-muted-foreground">{leverageAmount.toFixed(2)}x leverage</p>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">
                {maxLeverage.toFixed(2)}x
                <button
                  disabled={!!!maxLeverage}
                  className="ml-1 text-sm cursor-pointer text-chartreuse border-b border-transparent transition hover:border-chartreuse"
                  onClick={() => setLeverageAmount(Number(Math.floor(maxLeverage).toFixed(2)))}
                >
                  MAX
                </button>
              </span>
            </span>
          </div>
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
