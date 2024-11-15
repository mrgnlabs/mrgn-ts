"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter } from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  calculateLoopingParams,
  handleSimulationError,
  LoopingObject,
  cn,
  capture,
  extractErrorString,
  usePrevious,
  usePriorityFee,
  LoopActionTxns,
} from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper, SimulationResult, computeMaxLeverage } from "@mrgnlabs/marginfi-client-v2";
import { IconAlertTriangle, IconExternalLink, IconLoader2, IconSettings, IconWallet } from "@tabler/icons-react";
import capitalize from "lodash/capitalize";
import { useDebounce } from "@uidotdev/usehooks";

import { TradeSide, checkLoopingActionAvailable, generateStats, simulateLooping } from "./tradingBox.utils";
import { executeLeverageAction } from "~/utils";
import { useTradeStore, useUiStore } from "~/store";
import { GroupData } from "~/store/tradeStore";
import { WalletState } from "~/store/uiStore";
import { useWallet, useWalletStore } from "~/components/wallet-v2";
import { useConnection } from "~/hooks/use-connection";

import { ActionBox, ActionBoxProvider } from "~/components/action-box-v2";
import { TokenCombobox } from "../TokenCombobox/TokenCombobox";
import { TradingBoxSettingsDialog } from "./components/TradingBoxSettings/TradingBoxSettingsDialog";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Slider } from "~/components/ui/slider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type TradingBoxProps = {
  activeGroup: GroupData;
  side?: "long" | "short";
};

export const TradingBox = ({ activeGroup, side = "long" }: TradingBoxProps) => {
  const router = useRouter();
  const { walletContextState, wallet, connected } = useWallet();
  const { connection } = useConnection();
  const [tradeState, setTradeState] = React.useState<TradeSide>(side as TradeSide);
  const prevTradeState = usePrevious(tradeState);
  const [amount, setAmount] = React.useState<string>("");
  const [loopActionsTxns, setLoopActionsTxns] = React.useState<LoopActionTxns | null>(null);
  const [leverage, setLeverage] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [Stats, setStats] = React.useState<React.JSX.Element>(<></>);
  const [additionalChecks, setAdditionalChecks] = React.useState<ActionMessageType>();

  const debouncedLeverage = useDebounce(leverage, 1000);
  const debouncedAmount = useDebounce(amount, 1000);

  const leveragedAmount = React.useMemo(() => {
    if (tradeState === "long") {
      return loopActionsTxns?.actualDepositAmount;
    } else {
      return loopActionsTxns?.borrowAmount.toNumber();
    }
  }, [tradeState, loopActionsTxns]);

  const [fetchTradeState, nativeSolBalance, setIsRefreshingStore, refreshGroup] = useTradeStore((state) => [
    state.fetchTradeState,
    state.nativeSolBalance,
    state.setIsRefreshingStore,
    state.refreshGroup,
  ]);

  const [
    slippageBps,
    platformFeeBps,
    priorityType,
    broadcastType,
    maxCap,
    maxCapType,
    setSlippageBps,
    setIsActionComplete,
    setPreviousTxn,
  ] = useUiStore((state) => [
    state.slippageBps,
    state.platformFeeBps,
    state.priorityType,
    state.broadcastType,
    state.maxCap,
    state.maxCapType,
    state.setSlippageBps,
    state.setIsActionComplete,
    state.setPreviousTxn,
  ]);

  const priorityFee = usePriorityFee(priorityType, broadcastType, maxCapType, maxCap, connection);

  const [setIsWalletOpen] = useWalletStore((state) => [state.setIsWalletOpen]);

  React.useEffect(() => {
    if (tradeState !== prevTradeState) {
      clearStates();
    }
  }, [tradeState, prevTradeState]);

  const clearStates = () => {
    setAmount("");
    setLoopActionsTxns(null);
    setLeverage(1);
    setAdditionalChecks(undefined);
  };

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const isActiveWithCollat = true;

  const maxLeverage = React.useMemo(() => {
    if (activeGroup) {
      const deposit =
        tradeState === "long" ? activeGroup.pool.token.info.rawBank : activeGroup.pool.quoteTokens[0].info.rawBank;
      const borrow =
        tradeState === "long" ? activeGroup.pool.quoteTokens[0].info.rawBank : activeGroup.pool.token.info.rawBank;

      const { maxLeverage } = computeMaxLeverage(deposit, borrow);
      return maxLeverage;
    }
    return 0;
  }, [activeGroup, tradeState]);

  const collateralBank = React.useMemo(() => {
    if (activeGroup) {
      if (tradeState === "short") {
        return activeGroup.pool.quoteTokens[0];
      } else {
        return activeGroup.pool.token;
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
        loopActionsTxns,
        tradeSide: tradeState,
      }),
    [amount, connected, activeGroup, loopActionsTxns, tradeState]
  );

  const walletAmount = React.useMemo(() => {
    if (!activeGroup) return 0;
    const bank = tradeState === "long" ? activeGroup.pool.token : activeGroup.pool.quoteTokens[0];
    return bank?.userInfo.tokenAccount.balance;
  }, [tradeState, activeGroup]);

  const loadStats = React.useCallback(
    async (simulationResult: SimulationResult | null, looping: LoopingObject, isAccountInitialized: boolean) => {
      if (!activeGroup?.client || !activeGroup) {
        return;
      }
      setStats(
        generateStats(
          activeGroup.accountSummary,
          activeGroup.pool.token,
          activeGroup.pool.quoteTokens[0],
          simulationResult,
          looping,
          isAccountInitialized
        )
      );
    },
    [activeGroup]
  );

  const handleSimulation = React.useCallback(
    async (looping: LoopingObject, bank: ExtendedBankInfo, selectedAccount: MarginfiAccountWrapper | null) => {
      if (!activeGroup?.client) {
        return;
      }

      let simulationResult: SimulationResult | null = null;
      try {
        simulationResult = await simulateLooping({
          marginfiClient: activeGroup.client,
          account: selectedAccount,
          bank: bank,
          loopingTxn: looping.loopingTxn,
          feedCrankTxs: looping.feedCrankTxs,
        });
        setAdditionalChecks(undefined);
      } catch (error) {
        const additionChecks = handleSimulationError(error, bank, true);
        setAdditionalChecks(additionChecks);

        let message;
        if ((error as any).msg) message = (error as any).msg;
        // addStatus({ type: "simulation", msg: message ?? "Simulating transaction failed" }, "warning");
      } finally {
        loadStats(simulationResult, looping, !!selectedAccount);
      }
    },
    [loadStats, activeGroup?.client]
  );

  const loadLoopingVariables = React.useCallback(async () => {
    if (activeGroup?.client && activeGroup) {
      try {
        if (Number(amount) === 0 || leverage <= 1) {
          throw new Error("Amount is 0");
        }
        setIsLoading(true);

        let borrowBank, depositBank;

        if (tradeState === "long") {
          depositBank = activeGroup.pool.token;
          borrowBank = activeGroup.pool.quoteTokens[0];
        } else {
          depositBank = activeGroup.pool.quoteTokens[0];
          borrowBank = activeGroup.pool.token;
        }
        setAdditionalChecks(undefined);

        const strippedAmount = amount.replace(/,/g, "");
        const amountParsed = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

        const result = await calculateLoopingParams({
          marginfiClient: activeGroup?.client,
          marginfiAccount: activeGroup.selectedAccount,
          depositBank,
          borrowBank,
          targetLeverage: leverage,
          amount: amountParsed,
          slippageBps,
          priorityFee,
          connection,
          platformFeeBps,
          isTrading: true,
          broadcastType: broadcastType,
        });

        let loopingObject: LoopingObject | null = null;

        if ("quote" in result) {
          loopingObject = result;
          setLoopingObject(result);
        } else {
          // if txn couldn't be generated one cause could be that the account isn't created yet
          // most other causes are jupiter routing issues
          setAdditionalChecks(result);
        }

        if (loopingObject && (loopingObject.loopingTxn || !activeGroup.selectedAccount)) {
          await handleSimulation(loopingObject, depositBank, activeGroup.selectedAccount);
        }
      } catch (error) {
        setLoopingObject(null);
      } finally {
        setIsLoading(false);
      }
    }
  }, [
    activeGroup,
    amount,
    leverage,
    tradeState,
    priorityFee,
    slippageBps,
    connection,
    platformFeeBps,
    broadcastType,
    handleSimulation,
  ]);

  React.useEffect(() => {
    if (activeGroup) {
      setStats(
        generateStats(
          activeGroup.accountSummary,
          activeGroup.pool.token,
          activeGroup.pool.quoteTokens[0],
          null,
          null,
          false
        )
      );
    }
  }, [activeGroup]);

  const leverageActionCb = React.useCallback(
    async (depositBank: ExtendedBankInfo, borrowBank: ExtendedBankInfo) => {
      const sig = await executeLeverageAction({
        marginfiClient: activeGroup?.client ?? null,
        marginfiAccount: activeGroup?.selectedAccount ?? null,
        depositBank,
        borrowBank,
        walletContextState,
        depositAmount: Number(amount),
        tradeState,
        loopingObject,
        priorityFee,
        slippageBps: slippageBps,
        broadcastType: broadcastType,
        connection,
      });

      return sig;
    },
    [
      amount,
      connection,
      loopingObject,
      priorityFee,
      activeGroup,
      slippageBps,
      tradeState,
      broadcastType,
      walletContextState,
    ]
  );

  const handleLeverageAction = React.useCallback(async () => {
    if (loopingObject && activeGroup?.client && collateralBank) {
      try {
        setIsLoading(true);
        let depositBank: ExtendedBankInfo, borrowBank: ExtendedBankInfo;
        let sig: undefined | string[];

        if (activeGroup) {
          if (tradeState === "short") {
            depositBank = activeGroup.pool.quoteTokens[0];
            borrowBank = activeGroup.pool.token;
          } else {
            depositBank = activeGroup.pool.token;
            borrowBank = activeGroup.pool.quoteTokens[0];
          }
          sig = await leverageActionCb(depositBank, borrowBank);

          if (sig) {
            setIsActionComplete(true);
            setPreviousTxn({
              txnType: "TRADING",
              txn: sig[sig.length - 1],
              tradingOptions: {
                depositBank: depositBank as ActiveBankInfo,
                borrowBank: borrowBank as ActiveBankInfo,
                initDepositAmount: amount,
                entryPrice: activeGroup.pool.token.info.oraclePrice.priceRealtime.price.toNumber(),
                depositAmount: loopingObject.actualDepositAmount,
                borrowAmount: loopingObject.borrowAmount.toNumber(),
                leverage: leverage,
                type: tradeState,
                quote: loopingObject.quote,
              },
            });
            capture(`open_position`, {
              group: activeGroup?.groupPk?.toBase58(),
              txnSig: sig[sig.length - 1],
              token: depositBank.meta.tokenSymbol,
              entryPrice: activeGroup.pool.token.info.oraclePrice.priceRealtime.price.toNumber(),
              depositAmount: loopingObject.actualDepositAmount,
              borrowAmount: loopingObject.borrowAmount.toNumber(),
              leverage: leverage,
              type: tradeState,
            });
          }
        }
        // -------- Refresh state
        try {
          setLoopingObject(null);
          setIsRefreshingStore(true);
          await refreshGroup({
            connection,
            wallet,
            groupPk: activeGroup?.groupPk,
          });
        } catch (error: any) {
          console.log("Error while reloading state");
          console.log(error);
        }

        return sig;
      } catch (error: any) {
        const msg = extractErrorString(error);
        //Sentry.captureException({ message: error });
        // multiStepToast.setFailed(msg);
        console.log(`Error while longing: ${msg}`);
        console.log(error);
        return;
      } finally {
        setIsLoading(false);
      }
    }
  }, [
    activeGroup,
    amount,
    collateralBank,
    connection,
    leverage,
    leverageActionCb,
    loopingObject,
    refreshGroup,
    setIsActionComplete,
    setIsRefreshingStore,
    setPreviousTxn,
    tradeState,
    wallet,
  ]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLeverage, debouncedAmount]);

  if (!activeGroup) return null;

  return (
    <>
      <Card className="shadow-none border-border w-full">
        <CardContent className="pt-6">
          {isActiveWithCollat ? (
            <div className="space-y-4">
              <ToggleGroup
                type="single"
                className="w-full gap-4"
                value={tradeState}
                onValueChange={(value) => value && setTradeState(value as TradeSide)}
              >
                <ToggleGroupItem className="w-full border" value="long" aria-label="Toggle long">
                  Long
                </ToggleGroupItem>
                <ToggleGroupItem className="w-full border" value="short" aria-label="Toggle short">
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
                      className="flex items-center gap-1 ml-auto text-xs no-underline hover:underline"
                      onClick={() => handleMaxAmount()}
                    >
                      <IconWallet size={14} /> {numeralFormatter(walletAmount)}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => handleMaxAmount()}
                    className="no-underline hover:underline"
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
                    selected={activeGroup}
                    setSelected={(group) => {
                      router.push(`/trade/${group.client.group.address.toBase58()}`);
                      clearStates();
                    }}
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={
                      leveragedAmount ? leveragedAmount.toFixed(activeGroup.pool.token.info.state.mintDecimals) : 0
                    }
                    disabled
                    className="appearance-none border-none text-right focus-visible:ring-0 focus-visible:outline-none disabled:opacity-100 bg-background shadow-none border-accent"
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
        <CardFooter className="flex-col gap-5 md:pt-0">
          <ActionBoxProvider
            banks={[activeGroup.pool.token, activeGroup.pool.quoteTokens[0]]}
            nativeSolBalance={nativeSolBalance}
            marginfiClient={activeGroup.client}
            selectedAccount={activeGroup.selectedAccount}
            connected={connected}
            accountSummaryArg={activeGroup.accountSummary}
            showActionComplete={false}
            hidePoolStats={["type"]}
          >
            {connected && tradeState === "long" && activeGroup?.pool.token.userInfo.tokenAccount.balance === 0 && (
              <div className="w-full flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm bg-accent text-alert-foreground">
                <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
                <div className="space-y-1">
                  <p>
                    You need to hold {activeGroup?.pool.token.meta.tokenSymbol} to open a long position.{" "}
                    <button
                      className="border-b border-alert-foreground hover:border-transparent"
                      onClick={() => {
                        setIsWalletOpen(true);
                      }}
                    >
                      Swap tokens.
                    </button>
                  </p>
                </div>
              </div>
            )}
            {connected &&
              tradeState === "short" &&
              activeGroup?.pool.quoteTokens[0].userInfo.tokenAccount.balance === 0 && (
                <div className="w-full flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm bg-accent text-alert-foreground">
                  <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
                  <div className="space-y-1">
                    <p>
                      You need to hold {activeGroup?.pool.quoteTokens[0].meta.tokenSymbol} to open a short position.{" "}
                      <button
                        className="border-b border-alert-foreground hover:border-transparent"
                        onClick={() => {
                          setIsWalletOpen(true);
                        }}
                      >
                        Swap tokens.
                      </button>
                    </p>
                  </div>
                </div>
              )}
            {isActiveWithCollat ? (
              <>
                <div className="gap-1 w-full flex flex-col items-center">
                  {actionMethods.concat(additionalChecks ?? []).map(
                    (actionMethod, idx) =>
                      actionMethod.description && (
                        <div className="pb-6 w-full" key={idx}>
                          <div
                            className={cn(
                              "flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm",
                              actionMethod.actionMethod === "INFO" && "bg-accent text-info-foreground",
                              (!actionMethod.actionMethod || actionMethod.actionMethod === "WARNING") &&
                                "bg-accent text-alert-foreground",
                              actionMethod.actionMethod === "ERROR" && "bg-[#990000] text-white"
                            )}
                          >
                            <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
                            <div className="space-y-1">
                              <p>{actionMethod.description}</p>
                              {actionMethod.action && (
                                <ActionBox.Lend
                                  isDialog={true}
                                  useProvider={true}
                                  lendProps={{
                                    connected: connected,
                                    requestedLendType: ActionType.Deposit,
                                    requestedBank: actionMethod.action.bank ?? undefined,
                                    showAvailableCollateral: false,
                                    captureEvent: () => {
                                      capture("position_add_btn_click", {
                                        group: activeGroup?.groupPk?.toBase58(),
                                        token: actionMethod.action?.bank.meta.tokenSymbol,
                                      });
                                    },
                                    onComplete: () => {
                                      fetchTradeState({
                                        connection,
                                        wallet,
                                      });
                                    },
                                  }}
                                  dialogProps={{
                                    trigger: (
                                      <Button variant="outline" size="sm" className="gap-1 min-w-16">
                                        ${actionMethod.action.type}
                                      </Button>
                                    ),
                                    title: `${actionMethod.action.type} ${actionMethod.action.bank.meta.tokenSymbol}`,
                                  }}
                                />
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
                                    <IconExternalLink size={14} className="inline -translate-y-[1px]" />{" "}
                                    {actionMethod.linkText || "Read more"}
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
                    disabled={
                      !!actionMethods.concat(additionalChecks ?? []).filter((value) => value.isEnabled === false)
                        .length || isLoading
                    }
                    className={cn(
                      "w-full",
                      tradeState === "long" && "bg-success",
                      tradeState === "short" && "bg-error"
                    )}
                  >
                    {isLoading ? (
                      <IconLoader2 className="animate-spin" />
                    ) : (
                      <>
                        {capitalize(tradeState)} {activeGroup.pool.token.meta.tokenSymbol}
                      </>
                    )}
                  </Button>
                  <TradingBoxSettingsDialog
                    setSlippageBps={(value) => setSlippageBps(value * 100)}
                    slippageBps={slippageBps / 100}
                  >
                    <div className="flex justify-end gap-2 mt-2 ml-auto">
                      <button className="text-xs gap-1 h-6 px-2 flex items-center rounded-full border bg-transparent hover:bg-accent text-muted-foreground">
                        Settings <IconSettings size={16} />
                      </button>
                    </div>
                  </TradingBoxSettingsDialog>
                </div>
                {Stats}
              </>
            ) : (
              <ActionBox.Lend
                isDialog={true}
                useProvider={true}
                lendProps={{
                  connected: connected,
                  requestedLendType: ActionType.Deposit,
                  requestedBank: activeGroup.pool.quoteTokens[0],
                  showAvailableCollateral: false,
                  captureEvent: () => {
                    capture("position_add_btn_click", {
                      group: activeGroup?.groupPk?.toBase58(),
                      token: activeGroup.pool.quoteTokens[0].meta.tokenSymbol,
                    });
                  },
                  onComplete: () => {
                    fetchTradeState({
                      connection,
                      wallet,
                    });
                  },
                }}
                dialogProps={{
                  trigger: <Button className="w-full">Deposit Collateral</Button>,
                  title: `Supply ${activeGroup.pool.quoteTokens[0].meta.tokenSymbol}`,
                }}
              />
            )}
          </ActionBoxProvider>
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
