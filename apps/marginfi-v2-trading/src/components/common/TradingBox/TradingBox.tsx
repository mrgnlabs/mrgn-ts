"use client";

import React from "react";

import { useRouter } from "next/router";

import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import capitalize from "lodash/capitalize";

import { cn } from "~/utils/themeUtils";
import { useMrgnlendStore, useTradeStore } from "~/store";

import { TokenCombobox } from "../TokenCombobox/TokenCombobox";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconLoader, IconPyth } from "~/components/ui/icons";
import { Slider } from "~/components/ui/slider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { MarginfiAccountWrapper, computeMaxLeverage } from "@mrgnlabs/marginfi-client-v2";
import { LoopingObject, calculateLooping, simulateLooping } from "./tradingBox.utils";
import { useDebounce } from "~/hooks/useDebounce";

type TradeSide = "long" | "short";

const USDC_BANK_PK = new PublicKey("2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB");

type TradingBoxProps = {
  activeBank?: ExtendedBankInfo | null;
};

export const TradingBox = ({ activeBank }: TradingBoxProps) => {
  const router = useRouter();
  const { wallet } = useWalletContext();
  const { connection } = useConnection();
  const [collateralBanks] = useTradeStore((state) => [state]);
  const [tradeState, setTradeState] = React.useState<TradeSide>("long");
  // const [selectedPool, setSelectedPool] = React.useState<ExtendedBankInfo | null>(activeBank || null);
  const [amount, setAmount] = React.useState<string>("");
  const [loopingObject, setLoopingObject] = React.useState<LoopingObject | null>(null);
  const [leverage, setLeverage] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const debouncedLeverage = useDebounce(leverage, 1000);
  const debouncedAmount = useDebounce(amount, 1000);

  const borrowAmount = React.useMemo(() => loopingObject?.borrowAmount.toString(), [loopingObject]);

  const [setActiveBank, marginfiAccounts, marginfiClient] = useTradeStore((state) => [
    //activeGroup,
    // state.activeGroup,
    state.setActiveBank,
    state.marginfiAccounts,
    state.marginfiClient,
  ]);
  const [selectedAccount, extendedBankInfos] = useMrgnlendStore((state) => [
    state.selectedAccount,
    state.extendedBankInfos,
  ]);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const tempUsdcDepositBank = React.useMemo(
    () => extendedBankInfos.find((value) => value.meta.tokenSymbol.includes("USDC")),
    [extendedBankInfos]
  );

  const tempBorrowBank = React.useMemo(
    () => extendedBankInfos.find((value) => value.meta.tokenSymbol.toLowerCase().includes("jitosol")),
    [extendedBankInfos]
  );

  const activeGroup = React.useMemo(
    () => (tempBorrowBank && tempUsdcDepositBank ? { token: tempBorrowBank, usdc: tempUsdcDepositBank } : null),
    [tempUsdcDepositBank, tempBorrowBank]
  );

  // const calculateLooping

  const isActiveWithCollat = true;

  const maxLeverage = React.useMemo(() => {
    if (activeGroup) {
      const { maxLeverage, ltv } = computeMaxLeverage(activeGroup.usdc.info.rawBank, activeGroup.token.info.rawBank);
      return maxLeverage;
    }
    return 0;
  }, [activeGroup]);

  const maxAmount = React.useMemo(() => {
    if (activeGroup && activeGroup?.usdc?.isActive) {
      const usdcBank = activeGroup.usdc;

      const totalDeposited = usdcBank.position.amount;
      const usdValue = usdcBank.position.usdValue;

      return { maxAmount: totalDeposited, maxUsdValue: usdValue };
    }
    return { maxAmount: 0, maxUsdValue: 0 };
  }, [activeGroup]);

  const loadLoopingVariables = React.useCallback(async () => {
    if (selectedAccount && activeGroup) {
      try {
        if (Number(amount) === 0 || leverage <= 1) {
          throw new Error("Amount is 0");
        }
        setIsLoading(true);
        const slippageBps = 400;
        const looping = await calculateLooping(
          selectedAccount,
          activeGroup?.usdc,
          activeGroup?.token,
          leverage,
          Number(amount),
          slippageBps,
          connection
        );

        if (looping) {
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
  }, [leverage, amount, selectedAccount, activeGroup, marginfiClient]);

  const handleSimulation = React.useCallback(
    async (loopingTxn: VersionedTransaction, bank: ExtendedBankInfo, selectedAccount: MarginfiAccountWrapper) => {
      if (!marginfiClient) {
        return;
      }
      const simulationResult = await simulateLooping({
        marginfiClient,
        account: selectedAccount,
        bank: bank,
        loopingTxn: loopingTxn,
      });
    },
    [marginfiClient]
  );

  const handleShorting = React.useCallback(async () => {
    if (loopingObject?.loopingTxn && marginfiClient) {
      const sig = await marginfiClient.processTransaction(loopingObject?.loopingTxn);
      console.log({ sig });
    }
  }, [loopingObject, marginfiClient]);

  const handleAmountChange = React.useCallback(
    (amountRaw: string) => {
      const amount = formatAmount(amountRaw, maxAmount.maxUsdValue, activeGroup?.usdc ?? null, numberFormater);
      setAmount(amount);
    },
    [maxAmount, activeGroup, numberFormater]
  );

  const handleMaxAmount = React.useCallback(() => {
    if (activeGroup) {
      handleAmountChange(maxAmount.maxUsdValue.toString());
    }
  }, [activeGroup, maxAmount, handleAmountChange]);

  React.useEffect(() => {
    if (debouncedAmount && debouncedLeverage) {
      loadLoopingVariables();
    }
  }, [debouncedLeverage, debouncedAmount]);

  if (!activeGroup) return null;

  return (
    <Card className="bg-background-gray border-none">
      <CardContent className="pt-6">
        {isActiveWithCollat ? (
          <div className="space-y-4">
            <ToggleGroup
              type="single"
              className="w-full gap-4 bg-transparent"
              defaultValue="long"
              onValueChange={(value) => setTradeState(value as TradeSide)}
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
                <Button
                  size="sm"
                  variant="link"
                  className="no-underline hover:underline"
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
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">USD</span>
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
                  value={borrowAmount}
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
      <CardFooter className="flex-col gap-8">
        {isActiveWithCollat ? (
          <>
            <div className="gap-1 w-full flex flex-col items-center">
              <Button
                onClick={() => handleShorting()}
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
              <ActionBoxDialog requestedAction={ActionType.Deposit} requestedBank={activeGroup.usdc}>
                <Button
                  variant="link"
                  size="sm"
                  className="font-normal text-muted-foreground underline hover:no-underline"
                >
                  Desposit Collateral
                </Button>
              </ActionBoxDialog>
            </div>
            <dl className="w-full grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
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
            </dl>
          </>
        ) : (
          <ActionBoxDialog requestedAction={ActionType.Deposit} requestedBank={activeGroup.usdc}>
            <Button className="w-full">Deposit Collateral</Button>
          </ActionBoxDialog>
        )}
      </CardFooter>
    </Card>
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
