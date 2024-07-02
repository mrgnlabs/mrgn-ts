"use client";

import React from "react";

import { useRouter } from "next/router";

import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import capitalize from "lodash/capitalize";
import { WSOL_MINT, numeralFormatter } from "@mrgnlabs/mrgn-common";

import { cn } from "~/utils/themeUtils";
import { useMrgnlendStore, useTradeStore, useUiStore } from "~/store";

import { TokenCombobox } from "../TokenCombobox/TokenCombobox";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconAlertTriangle, IconLoader, IconPyth, IconSettings, IconWallet } from "~/components/ui/icons";
import { Slider } from "~/components/ui/slider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { MarginfiAccountWrapper, SimulationResult, computeMaxLeverage } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMethod,
  LoopingObject,
  TradeSide,
  calculateLooping,
  checkAdditionalActionAvailable,
  checkLoopingActionAvailable,
  generateStats,
  simulateLooping,
} from "./tradingBox.utils";
import { useDebounce } from "~/hooks/useDebounce";
import { executeLeverageAction, extractErrorString, usePrevious } from "~/utils";
import Link from "next/link";
import { TradingBoxSettingsDialog } from "./components/TradingBoxSettings/TradingBoxSettingsDialog";

const USDC_BANK_PK = new PublicKey("2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB");

type TradingBoxProps = {
  activeBank?: ExtendedBankInfo | null;
};

type StatusType = {
  type: "simulation" | "bank";
  msg: string;
};

export const TradingBox = ({ activeBank }: TradingBoxProps) => {
  const router = useRouter();
  const { walletContextState, wallet, connected } = useWalletContext();
  const { connection } = useConnection();
  const [tradeState, setTradeState] = React.useState<TradeSide>("long");
  const prevTradeState = usePrevious(tradeState);
  const [amount, setAmount] = React.useState<string>("");
  const [loopingObject, setLoopingObject] = React.useState<LoopingObject | null>(null);
  const [leverage, setLeverage] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [Stats, setStats] = React.useState<React.JSX.Element>(<></>);
  const [additionalChecks, setAdditionalChecks] = React.useState<ActionMethod>();
  const [showSettings, setShowSettings] = React.useState<boolean>(false);

  const debouncedLeverage = useDebounce(leverage, 1000);
  const debouncedAmount = useDebounce(amount, 1000);

  // const borrowAmount = React.useMemo(() => loopingObject?.borrowAmount.toNumber(), [loopingObject]);
  const leveragedAmount = React.useMemo(() => {
    if (tradeState === "long") {
      return loopingObject?.actualDepositAmount;
    } else {
      return loopingObject?.borrowAmount.toNumber();
    }
  }, [tradeState, loopingObject]);

  const [
    selectedAccount,
    activeGroup,
    accountSummary,
    setActiveBank,
    marginfiAccounts,
    marginfiClient,
    nativeSolBalance,
  ] = useTradeStore((state) => [
    state.selectedAccount,
    state.activeGroup,
    state.accountSummary,
    state.setActiveBank,
    state.marginfiAccounts,
    state.marginfiClient,
    state.nativeSolBalance,
  ]);

  const [slippageBps, priorityFee, setSlippageBps, setPriorityFee, setIsActionComplete, setPreviousTxn] = useUiStore(
    (state) => [
      state.slippageBps,
      state.priorityFee,
      state.setSlippageBps,
      state.setPriorityFee,
      state.setIsActionComplete,
      state.setPreviousTxn,
    ]
  );
  const [_, extendedBankInfos] = useMrgnlendStore((state) => [state.selectedAccount, state.extendedBankInfos]);

  React.useEffect(() => {
    if (tradeState !== prevTradeState) {
      setAmount("");
      setLoopingObject(null);
      setLeverage(1);
    }
  }, [tradeState, prevTradeState]);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const tempUsdcDepositBank = React.useMemo(
    () => extendedBankInfos.find((value) => value.meta.tokenSymbol.includes("USDC")),
    [extendedBankInfos]
  );

  const tempBorrowBank = React.useMemo(
    () => extendedBankInfos.find((value) => value.meta.tokenSymbol.toLowerCase().includes("sol")) as any,
    [extendedBankInfos]
  );

  // const activeGroup = React.useMemo(
  //   () => (tempBorrowBank && tempUsdcDepositBank ? { token: tempBorrowBank, usdc: tempUsdcDepositBank } : null),
  //   [tempUsdcDepositBank, tempBorrowBank]
  // );

  const isActiveWithCollat = true;

  const maxLeverage = React.useMemo(() => {
    if (activeGroup) {
      const deposit = tradeState === "long" ? activeGroup.token.info.rawBank : activeGroup.usdc.info.rawBank;
      const borrow = tradeState === "long" ? activeGroup.usdc.info.rawBank : activeGroup.token.info.rawBank;

      const { maxLeverage, ltv } = computeMaxLeverage(deposit, borrow);
      return maxLeverage;
    }
    return 0;
  }, [activeGroup, tradeState]);

  const collateralBank = React.useMemo(() => {
    if (activeGroup) {
      if (tradeState === "short") {
        return activeGroup.usdc;
      } else {
        return activeGroup.token;
      }
    }
  }, [activeGroup, tradeState]);

  const maxAmount = React.useMemo(() => {
    if (collateralBank) {
      return collateralBank.userInfo.maxDeposit;
    }
    return 0;
  }, [collateralBank]);

  const actionMethods = React.useMemo(
    () =>
      checkLoopingActionAvailable({
        amount,
        connected,
        activeGroup,
        loopingObject,
        tradeSide: tradeState,
      }),
    [amount, connected, activeGroup, loopingObject, tradeState]
  );

  const walletAmount = React.useMemo(() => {
    if (!activeGroup) return 0;
    console.log(activeGroup);
    return activeGroup.token.info.state.mint?.equals && activeGroup.token.info.state.mint?.equals(WSOL_MINT)
      ? activeGroup.token?.userInfo.tokenAccount.balance + nativeSolBalance
      : activeGroup.token?.userInfo.tokenAccount.balance;
  }, [nativeSolBalance, activeGroup]);

  const loadLoopingVariables = React.useCallback(async () => {
    if (marginfiClient && activeGroup) {
      try {
        if (Number(amount) === 0 || leverage <= 1) {
          throw new Error("Amount is 0");
        }
        setIsLoading(true);

        let borrowBank, depositBank;

        if (tradeState === "long") {
          depositBank = activeGroup.token;
          borrowBank = activeGroup.usdc;
        } else {
          depositBank = activeGroup.usdc;
          borrowBank = activeGroup.token;
        }

        const looping = await calculateLooping(
          marginfiClient,
          selectedAccount,
          depositBank,
          borrowBank,
          leverage,
          Number(amount),
          slippageBps,
          priorityFee,
          connection
        );

        if (looping && looping?.loopingTxn && selectedAccount) {
          await handleSimulation(looping.loopingTxn, activeGroup.token, selectedAccount);
          // const simulation = await simulateLooping({
          //   marginfiClient,
          //   account: selectedAccount,
          //   bank: activeGroup.token,
          //   loopingTxn: looping.loopingTxn,
          // });
        }

        setLoopingObject(looping);
      } catch (error) {
        setLoopingObject(null);
      } finally {
        setIsLoading(false);
      }
    }
  }, [leverage, tradeState, slippageBps, amount, selectedAccount, activeGroup, marginfiClient]);

  const handleSimulation = React.useCallback(
    async (loopingTxn: VersionedTransaction, bank: ExtendedBankInfo, selectedAccount: MarginfiAccountWrapper) => {
      if (!marginfiClient) {
        return;
      }

      let simulationResult: SimulationResult | null = null;
      try {
        simulationResult = await simulateLooping({
          marginfiClient,
          account: selectedAccount,
          bank: bank,
          loopingTxn: loopingTxn,
        });
      } catch (error) {
        const additionChecks = checkAdditionalActionAvailable(error);
        setAdditionalChecks(additionChecks);

        let message;
        if ((error as any).msg) message = (error as any).msg;
        // addStatus({ type: "simulation", msg: message ?? "Simulating transaction failed" }, "warning");
      } finally {
        // if (simulationResult) removeStatus("simulation");
        loadStats(simulationResult);
      }
    },
    [marginfiClient]
  );

  React.useEffect(() => {
    if (activeGroup) {
      setStats(generateStats(accountSummary, activeGroup.token, activeGroup.usdc, null));
    }
  }, [accountSummary, activeGroup?.token, activeGroup?.usdc]);

  const loadStats = React.useCallback(
    async (simulationResult: SimulationResult | null) => {
      if (!marginfiClient || !activeGroup) {
        return;
      }
      setStats(generateStats(accountSummary, activeGroup.token, activeGroup.usdc, simulationResult));
    },
    [accountSummary, activeGroup, marginfiClient]
  );

  const leverageActionCb = React.useCallback(
    async (depositBank: ExtendedBankInfo, borrowBank: ExtendedBankInfo) => {
      const sig = await executeLeverageAction({
        marginfiClient,
        marginfiAccount: selectedAccount,
        depositBank,
        borrowBank,
        walletContextState,
        depositAmount: Number(amount),
        tradeState,
        loopingObject,
        priorityFee,
        slippageBps: slippageBps,
        connection,
      });

      return sig;
    },
    [
      amount,
      connection,
      loopingObject,
      marginfiClient,
      priorityFee,
      selectedAccount,
      slippageBps,
      tradeState,
      walletContextState,
    ]
  );

  const handleLeverageAction = React.useCallback(async () => {
    if (loopingObject && marginfiClient && collateralBank) {
      try {
        // const params =

        // const sig = await marginfiClient.processTransaction(loopingObject?.loopingTxn);
        // multiStepToast.setSuccessAndNext();

        let depositBank: ExtendedBankInfo, borrowBank: ExtendedBankInfo;
        let sig: undefined | string;

        if (activeGroup) {
          if (tradeState === "short") {
            depositBank = activeGroup.usdc;
            borrowBank = activeGroup.token;
          } else {
            depositBank = activeGroup.token;
            borrowBank = activeGroup.usdc;
          }
          sig = await leverageActionCb(depositBank, borrowBank);
        }

        if (sig) {
          setIsActionComplete(true);
          // setPreviousTxn({
          //   type: ActionType.Borrow ,
          //   bank: bank as ActiveBankInfo,
          //   amount: borrowOrLendAmount,
          //   txn: txnSig!,
          // });
        }

        return sig;
      } catch (error: any) {
        const msg = extractErrorString(error);
        //Sentry.captureException({ message: error });
        // multiStepToast.setFailed(msg);
        console.log(`Error while longing: ${msg}`);
        console.log(error);
        return;
      }
    }
  }, [activeGroup, collateralBank, leverageActionCb, loopingObject, marginfiClient, setIsActionComplete, tradeState]);

  const handleAmountChange = React.useCallback(
    (amountRaw: string) => {
      const amount = formatAmount(amountRaw, maxAmount, collateralBank ?? null, numberFormater);
      setAmount(amount);
    },
    [maxAmount, collateralBank, numberFormater]
  );

  const handleMaxAmount = React.useCallback(() => {
    if (activeGroup) {
      handleAmountChange(maxAmount.toString());
    }
  }, [activeGroup, maxAmount, handleAmountChange]);

  React.useEffect(() => {
    if (debouncedAmount && debouncedLeverage) {
      loadLoopingVariables();
    }
  }, [debouncedLeverage, debouncedAmount]);

  if (!activeGroup) return null;

  return (
    <>
      <Card className="bg-background-gray border-none">
        <CardContent className="pt-6">
          {isActiveWithCollat ? (
            <div className="space-y-4">
              <ToggleGroup
                type="single"
                className="w-full gap-4 bg-transparent"
                defaultValue="long"
                onValueChange={(value) => value && setTradeState(value as TradeSide)}
              >
                <ToggleGroupItem
                  className="w-full border border-accent hover:bg-accent hover:text-primary data-[state=on]:bg-accent data-[state=on]:border-transparent"
                  value="long"
                  aria-label="Toggle long"
                >
                  Long
                </ToggleGroupItem>
                <ToggleGroupItem
                  className="w-full border border-accent hover:bg-accent hover:text-primary data-[state=on]:bg-accent data-[state=on]:border-transparent"
                  value="short"
                  aria-label="Toggle short"
                >
                  Short
                </ToggleGroupItem>
              </ToggleGroup>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Amount</Label>
                  {walletAmount > 0 && (
                    <Button
                      size="sm"
                      variant="link"
                      className="flex items-center gap-1 ml-auto text-xs cursor-pointer transition-colors hover:text-mrgn-chartreuse hover:no-underline"
                      onClick={() => handleMaxAmount()}
                    >
                      <IconWallet size={14} /> {numeralFormatter(walletAmount)}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="link"
                    className="no-underline transition-colors hover:text-mrgn-chartreuse hover:no-underline"
                    onClick={() => handleMaxAmount()}
                  >
                    Max
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className=""
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                    {collateralBank?.meta.tokenSymbol}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Size of {tradeState}</Label>
                <div className="relative flex gap-2 items-center border border-accent p-2 rounded-lg">
                  <TokenCombobox
                    selected={activeGroup.token}
                    setSelected={(bank) => {
                      router.push(`/trade/${bank.address.toBase58()}`);
                      setActiveBank({ bankPk: bank.address, connection, wallet });
                    }}
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={leveragedAmount ? leveragedAmount.toFixed(activeGroup.token.info.state.mintDecimals) : 0}
                    disabled
                    className="appearance-none border-none text-right focus-visible:ring-0 focus-visible:outline-none disabled:opacity-100 border-accent"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Leverage</Label>
                  <span className="text-sm font-medium text-muted-foreground">{leverage.toFixed(2)}x</span>
                </div>
                <Slider
                  className="w-full"
                  defaultValue={[1]}
                  min={1}
                  step={0.01}
                  max={maxLeverage === 0 ? 1 : maxLeverage}
                  value={[leverage]}
                  onValueChange={(value) => {
                    if (value[0] > maxLeverage) return;
                    setLeverage(value[0]);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-center">
              <p className="text-muted-foreground">
                You need to deposit collateral (USDC) in this pool before you can trade.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-5">
          {isActiveWithCollat ? (
            <>
              <div className="gap-1 w-full flex flex-col items-center">
                {actionMethods.concat(additionalChecks ?? []).map(
                  (actionMethod, idx) =>
                    actionMethod.description && (
                      <div className="pb-6" key={idx}>
                        <div
                          className={cn(
                            "flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm",
                            actionMethod.actionMethod === "INFO" && "bg-info text-info-foreground",
                            (!actionMethod.actionMethod || actionMethod.actionMethod === "WARNING") &&
                              "bg-alert text-alert-foreground",
                            actionMethod.actionMethod === "ERROR" && "bg-[#990000] text-primary"
                          )}
                        >
                          <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
                          <div className="space-y-1">
                            <p>{actionMethod.description}</p>
                            {actionMethod.action && (
                              <ActionBoxDialog
                                requestedAction={actionMethod.action.type}
                                requestedBank={actionMethod.action.bank}
                              >
                                <p className="underline hover:no-underline cursor-pointer">
                                  {actionMethod.action.type} {actionMethod.action.bank.meta.tokenSymbol}
                                </p>
                              </ActionBoxDialog>
                            )}
                            {actionMethod.link && (
                              <p>
                                {/* <span className="hidden md:inline">-</span>{" "} */}
                                <Link
                                  href={actionMethod.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline hover:no-underline"
                                >
                                  Read more
                                </Link>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                )}
                <Button
                  onClick={() => handleLeverageAction()}
                  disabled={!!actionMethods.filter((value) => value.isEnabled === false).length || isLoading}
                  className={cn("w-full", tradeState === "long" && "bg-success", tradeState === "short" && "bg-error")}
                >
                  {isLoading ? (
                    <IconLoader />
                  ) : (
                    <>
                      {capitalize(tradeState)} {activeGroup.token.meta.tokenSymbol}
                    </>
                  )}
                </Button>
                <TradingBoxSettingsDialog
                  setSlippageBps={(value) => setSlippageBps(value * 100)}
                  slippageBps={slippageBps / 100}
                >
                  <div className="flex justify-end gap-2 mt-2 ml-auto">
                    <button className="text-xs gap-1 h-6 px-2 flex items-center rounded-full border border-background-gray-light bg-transparent hover:bg-background-gray-light text-muted-foreground">
                      Settings <IconSettings size={16} />
                    </button>
                  </div>
                </TradingBoxSettingsDialog>
                {/* <ActionBoxDialog requestedAction={ActionType.Deposit} requestedBank={activeGroup.usdc}>
                <Button
                  variant="link"
                  size="sm"
                  className="font-normal text-muted-foreground underline hover:no-underline"
                >
                  Desposit Collateral
                </Button>
              </ActionBoxDialog> */}
              </div>
              {Stats}
              {/* <dl className="w-full grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
              <dt>Entry Price</dt>
              <dd className="text-primary text-right">$177.78</dd>
              <dt>Liquidation Price</dt>
              <dd className="text-primary text-right">$166.67</dd>
              <dt>Oracle</dt>
              <dd className="text-primary flex items-center gap-1 ml-auto">
                Pyth <IconPyth size={14} />
              </dd>
              <dt>Available Liquidity</dt>
              <dd className="text-primary text-right">$1,000,000</dd>
            </dl> */}
            </>
          ) : (
            <ActionBoxDialog requestedAction={ActionType.Deposit} requestedBank={activeGroup.usdc}>
              <Button className="w-full">Deposit Collateral</Button>
            </ActionBoxDialog>
          )}
        </CardFooter>
      </Card>
    </>
  );
};

// remove function once rebased with looper
export const formatAmount = (
  newAmount: string,
  maxAmount: number,
  bank: ExtendedBankInfo | null,
  numberFormater: Intl.NumberFormat
) => {
  let formattedAmount: string, amount: number;
  // Remove commas from the formatted string
  const newAmountWithoutCommas = newAmount.replace(/,/g, "");
  let decimalPart = newAmountWithoutCommas.split(".")[1];
  const mintDecimals = bank?.info.state.mintDecimals ?? 9;

  if (
    (newAmount.endsWith(",") || newAmount.endsWith(".")) &&
    !newAmount.substring(0, newAmount.length - 1).includes(".")
  ) {
    amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
    formattedAmount = numberFormater.format(amount).concat(".");
  } else {
    const isDecimalPartInvalid = isNaN(Number.parseFloat(decimalPart));
    if (!isDecimalPartInvalid) decimalPart = decimalPart.substring(0, mintDecimals);
    decimalPart = isDecimalPartInvalid
      ? ""
      : ".".concat(Number.parseFloat("1".concat(decimalPart)).toString().substring(1));
    amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
    formattedAmount = numberFormater.format(amount).split(".")[0].concat(decimalPart);
  }

  if (amount > maxAmount) {
    return numberFormater.format(maxAmount);
  } else {
    return formattedAmount;
  }
};
