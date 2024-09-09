import React from "react";

import BigNumber from "bignumber.js";
import Image from "next/image";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { formatAmount, getTokenImageURL } from "@mrgnlabs/mrgn-utils";
import { percentFormatter } from "@mrgnlabs/mrgn-common";

import { useActionBoxStore } from "~/hooks/useActionBoxStore";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { calcLstYield, LSTS_SOLANA_COMPASS_MAP, calcNetLoopingApy } from "~/utils";

import { ActionBoxTokens } from "~/components/common/ActionBox/components";
import { InputAction } from "~/components/common/ActionBox/components/ActionBoxInput/Components/InputAction";
import { Input } from "~/components/ui/input";
import { Slider } from "~/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { IconChevronDown } from "~/components/ui/icons";
import { cn } from "~/utils";

import { useMrgnlendStore, useUiStore } from "~/store";
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
  const { connection } = useConnection();
  const { wallet } = useWalletContext();
  const [selectedAccount] = useMrgnlendStore((state) => [state.selectedAccount]);
  const [
    setSelectedBank,
    setRepayBank,
    setSelectedStakingAccount,
    setLeverage,
    setLooping,
    actionTxns,

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
    state.actionTxns,
    state.loopingAmounts,
    state.leverage,
    state.maxLeverage,
    state.selectedBank,
    state.selectedRepayBank,
    state.amountRaw,
    state.isLoading,
  ]);
  const [priorityFee] = useUiStore((state) => [state.priorityFee]);

  // const [inputAmount, setInputAmount] = React.useState<string>("");
  const [leverageAmount, setLeverageAmount] = React.useState<number>(0);
  const debouncedAmount = useDebounce(amountRaw, 1000);

  const debouncedLeverage = useDebounce(leverageAmount, 1000);

  const [netApyRaw, setNetApyRaw] = React.useState(0);
  const [lstDepositApy, setLstDepositApy] = React.useState(0);
  const [lstBorrowApy, setLstBorrowApy] = React.useState(0);
  const [depositTokenApy, setDepositTokenApy] = React.useState<{ tokenApy: number; lstApy: number }>({
    tokenApy: 0,
    lstApy: 0,
  });
  const [borrowTokenApy, setBorrowTokenApy] = React.useState<{ tokenApy: number; lstApy: number }>({
    tokenApy: 0,
    lstApy: 0,
  });

  const prevLeverageRef = React.useRef(leverage);
  const prevDebouncedAmountRef = React.useRef(debouncedAmount);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const bothBanksSelected = React.useMemo(
    () => Boolean(selectedBank && selectedRepayBank),
    [selectedBank, selectedRepayBank]
  );

  const isDepositingLst = React.useMemo(() => {
    const lstsArr = Object.keys(LSTS_SOLANA_COMPASS_MAP);
    return selectedBank && lstsArr.includes(selectedBank.meta.tokenSymbol);
  }, [selectedBank]);

  const isBorrowingLst = React.useMemo(() => {
    const lstsArr = Object.keys(LSTS_SOLANA_COMPASS_MAP);
    return selectedRepayBank && lstsArr.includes(selectedRepayBank.meta.tokenSymbol);
  }, [selectedRepayBank]);

  const getLstYield = React.useCallback(async (bank: ExtendedBankInfo) => {
    const solanaCompassKey = LSTS_SOLANA_COMPASS_MAP[bank.meta.tokenSymbol];
    if (!solanaCompassKey) return 0;

    const response = await fetch(`/api/lst?solanaCompassKey=${solanaCompassKey}`);
    if (!response.ok) return 0;

    const solanaCompassPrices = await response.json();
    return calcLstYield(solanaCompassPrices);
  }, []);

  const refreshTxn = React.useCallback(() => {
    if (selectedAccount && debouncedAmount)
      setLooping({ marginfiAccount: selectedAccount, connection: connection, priorityFee });
  }, [connection, debouncedAmount, priorityFee, selectedAccount, setLooping]);

  const formatAmountCb = React.useCallback(
    (newAmount: string, bank: ExtendedBankInfo | null) => {
      handleInputChange(formatAmount(newAmount, maxAmount, bank, numberFormater));
    },
    [handleInputChange, maxAmount, numberFormater]
  );

  React.useEffect(() => {
    if (!selectedBank || !selectedRepayBank) {
      return;
    }

    const updateLstApy = async (bank: ExtendedBankInfo) => {
      const apy = await getLstYield(bank);
      return apy;
    };

    if (isDepositingLst) {
      updateLstApy(selectedBank).then((apy) => setLstDepositApy(apy));
    } else {
      setLstDepositApy(0);
    }

    if (isBorrowingLst) {
      updateLstApy(selectedRepayBank).then((apy) => setLstBorrowApy(apy));
    } else {
      setLstBorrowApy(0);
    }
  }, [selectedBank, selectedRepayBank, isDepositingLst, isBorrowingLst, getLstYield]);

  React.useEffect(() => {
    if (!selectedBank || !selectedRepayBank) {
      setNetApyRaw(0);
      return;
    }

    const updateNetApy = async () => {
      const { totalDepositApy, totalBorrowApy, depositLstApy, borrowLstApy, netApy } = calcNetLoopingApy(
        selectedBank,
        selectedRepayBank,
        isDepositingLst ? lstDepositApy : 0,
        isBorrowingLst ? lstBorrowApy : 0,
        leverageAmount
      );

      setNetApyRaw(netApy);
      setDepositTokenApy({ tokenApy: totalDepositApy, lstApy: depositLstApy });
      setBorrowTokenApy({ tokenApy: totalBorrowApy, lstApy: borrowLstApy });
    };

    updateNetApy();
  }, [
    selectedBank,
    leverageAmount,
    selectedRepayBank,
    isDepositingLst,
    getLstYield,
    isBorrowingLst,
    lstDepositApy,
    lstBorrowApy,
  ]);

  const netApy = React.useMemo(() => {
    if (!netApyRaw) {
      return;
    }

    return percentFormatter.format(Math.abs(netApyRaw));
  }, [netApyRaw]);

  React.useEffect(
    () => setLeverage(debouncedLeverage, selectedAccount, connection, priorityFee),
    [debouncedLeverage, selectedAccount, connection, setLeverage, priorityFee]
  );

  React.useEffect(() => {
    if (
      selectedAccount &&
      connection &&
      leverage &&
      debouncedAmount !== prevDebouncedAmountRef.current &&
      leverage === prevLeverageRef.current
    ) {
      setLooping({ marginfiAccount: selectedAccount, connection: connection, priorityFee });
    }

    prevLeverageRef.current = leverage;
    prevDebouncedAmountRef.current = debouncedAmount;
  }, [debouncedAmount, leverage, selectedAccount, connection, priorityFee, setLooping]);

  React.useEffect(() => setLeverageAmount(leverage), [leverage]);

  React.useEffect(() => {
    const blockhash = actionTxns?.actionTxn?.message.recentBlockhash;

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
  }, [refreshTxn, actionTxns, connection]);

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
                handleInputChange("0");
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
              value={amountRaw}
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
                value={loopingAmounts?.borrowAmount.decimalPlaces(4, BigNumber.ROUND_DOWN).toString()}
                placeholder="0"
                className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
              />
            </div>
          </div>
        </div>
      </div>
      <div
        className={cn(
          "space-y-6 py-4 px-1",
          (!bothBanksSelected || !amountRaw) && "pointer-events-none cursor-default opacity-50"
        )}
      >
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
              if (value[0] > maxLeverage || value[0] <= 1) return;
              setLeverageAmount(value[0]);
            }}
            disabled={!bothBanksSelected || !amountRaw}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal text-muted-foreground">
              {leverageAmount > 1 && `${leverageAmount.toFixed(2)}x leverage`}
            </p>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">
                {maxLeverage.toFixed(2)}x
                <button
                  disabled={!!!maxLeverage}
                  className="ml-1 text-xs cursor-pointer text-chartreuse border-b border-transparent transition hover:border-chartreuse"
                  onClick={() => setLeverageAmount(Number(maxLeverage))}
                >
                  MAX
                </button>
              </span>
            </span>
          </div>
        </div>
        {bothBanksSelected && netApy && (
          <div className="flex items-center justify-between">
            <Popover>
              <PopoverTrigger className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                Net APY <IconChevronDown size={16} />
              </PopoverTrigger>
              <PopoverContent align="center" className="w-auto min-w-52">
                {bothBanksSelected && selectedBank && selectedRepayBank && (
                  <>
                    <ul className="text-xs space-y-2.5">
                      {[selectedBank, selectedRepayBank].map((bank, index) => {
                        const isDepositBank = index === 0;
                        return (
                          <>
                            <li key={bank.meta.tokenSymbol} className="flex items-center gap-8 justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Image
                                  src={getTokenImageURL(bank.meta.tokenSymbol)}
                                  width={16}
                                  height={16}
                                  alt={bank.meta.tokenName}
                                  className="rounded-full"
                                />
                                <strong className="font-medium">{bank.meta.tokenSymbol}</strong>
                              </div>
                              <span className={cn("ml-auto", isDepositBank ? "text-success" : "text-warning")}>
                                {percentFormatter.format(
                                  isDepositBank ? depositTokenApy.tokenApy : borrowTokenApy.tokenApy
                                )}
                              </span>
                            </li>

                            {isDepositBank && isDepositingLst && (
                              <li className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Image
                                    src={getTokenImageURL(bank.meta.tokenSymbol)}
                                    width={16}
                                    height={16}
                                    alt={bank.meta.tokenName}
                                    className="rounded-full"
                                  />
                                  <div>
                                    <strong className="font-medium">{bank.meta.tokenSymbol}</strong> stake yield
                                  </div>
                                </div>
                                <span className="text-success text-right">
                                  {percentFormatter.format(depositTokenApy.lstApy)}
                                </span>
                              </li>
                            )}

                            {!isDepositBank && isBorrowingLst && (
                              <li className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Image
                                    src={getTokenImageURL(bank.meta.tokenSymbol)}
                                    width={16}
                                    height={16}
                                    alt={bank.meta.tokenName}
                                    className="rounded-full"
                                  />
                                  <div>
                                    <strong className="font-medium">{bank.meta.tokenSymbol}</strong> stake yield
                                  </div>
                                </div>
                                <span className="text-warning text-right">
                                  {percentFormatter.format(borrowTokenApy.lstApy)}
                                </span>
                              </li>
                            )}
                          </>
                        );
                      })}
                    </ul>
                  </>
                )}
              </PopoverContent>
            </Popover>
            <span className={cn("text-xs", netApyRaw < 0 ? "text-warning" : "text-success")}>{netApy} APY</span>
          </div>
        )}
      </div>
    </div>
  );
};
