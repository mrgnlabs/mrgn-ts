import React from "react";

import Image from "next/image";

import { getPriceWithConfidence, MarginRequirementType, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { percentFormatter, numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore } from "~/store";
import {
  clampedNumeralFormatter,
  cn,
  deserializeInstruction,
  getAdressLookupTableAccounts,
  getMaintHealthColor,
  isWholePosition,
  RepayWithCollatOptions,
} from "~/utils";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { useDebounce } from "~/hooks/useDebounce";

import { REDUCE_ONLY_BANKS } from "~/components/desktop/AssetsList/AssetRow";
import { IconArrowRight, IconAlertTriangle, IconAlertTriangleFilled } from "~/components/ui/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Skeleton } from "~/components/ui/skeleton";

import { AvailableCollateral } from "./AvailableCollateral";
import { createJupiterApiClient } from "@jup-ag/api";
import { AddressLookupTableAccount } from "@solana/web3.js";

export interface ActionPreview {
  health: number;
  liquidationPrice: number | null;
  depositRate: number;
  borrowRate: number;
  positionAmount: number;
  availableCollateral: {
    ratio: number;
    amount: number;
  };
}

interface ActionBoxPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  actionMode: ActionType;
  isEnabled: boolean;
  amount: number;
  repayWithCollatOptions?: RepayWithCollatOptions;
  children: React.ReactNode;
}

export const LendingPreview = ({
  selectedBank,
  actionMode,
  isEnabled,
  amount,
  repayWithCollatOptions,
  children,
}: ActionBoxPreviewProps) => {
  const [preview, setPreview] = React.useState<ActionPreview | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [selectedAccount] = useMrgnlendStore((state) => [state.selectedAccount]);

  const debouncedAmount = useDebounce<number | null>(amount, 500);

  React.useEffect(() => {
    setIsLoading(true);
  }, [amount]);

  const showLending = React.useMemo(
    () => actionMode === ActionType.Deposit || actionMode === ActionType.Withdraw,
    [actionMode]
  );

  const { isBankFilled, isBankHigh, bankCap } = useAssetItemData({
    bank: selectedBank!,
    isInLendingMode: showLending,
  });

  const [accountSummary] = useMrgnlendStore((state) => [state.accountSummary]);

  // const isEmptyAccount = React.useMemo(() => !accountSummary.balance || !accountSummary.healthFactor, [accountSummary]);

  const healthFactor = React.useMemo(
    () => (!accountSummary.balance || !accountSummary.healthFactor ? 1 : accountSummary.healthFactor),
    [accountSummary]
  );

  const isReduceOnly = React.useMemo(
    () => (selectedBank?.meta?.tokenSymbol ? REDUCE_ONLY_BANKS.includes(selectedBank?.meta.tokenSymbol) : false),
    [selectedBank]
  );

  const isBorrowing = selectedAccount?.activeBalances.find((b) => b.active && b.liabilityShares.gt(0)) !== undefined;

  const currentPositionAmount = selectedBank?.isActive ? selectedBank.position.amount : 0;

  const price = selectedBank ? getPriceWithConfidence(selectedBank.info.oraclePrice, false).price.toNumber() : 0;

  const liquidationColor = React.useMemo(
    () => (preview && preview.liquidationPrice ? getMaintHealthColor(preview.liquidationPrice / price) : ""),
    [preview, price]
  );
  const healthColor = React.useMemo(
    () => getMaintHealthColor(preview?.health ?? healthFactor),
    // () => getMaintHealthColor(preview?.health ?? (isEmptyAccount ? 100 : accountSummary.healthFactor)),
    [preview?.health, healthFactor]
  );

  const computePreview = React.useCallback(async () => {
    if (!selectedAccount || !selectedBank || debouncedAmount === null) {
      setIsLoading(false);
      return;
    }

    try {
      let simulationResult: SimulationResult;

      if (debouncedAmount === 0) {
        setPreview(null);
        return;
      }

      if (actionMode === ActionType.Deposit) {
        simulationResult = await selectedAccount.simulateDeposit(debouncedAmount, selectedBank.address);
      } else if (actionMode === ActionType.Withdraw) {
        simulationResult = await selectedAccount.simulateWithdraw(
          debouncedAmount,
          selectedBank.address,
          selectedBank.isActive && isWholePosition(selectedBank, debouncedAmount)
        );
      } else if (actionMode === ActionType.Borrow) {
        simulationResult = await selectedAccount.simulateBorrow(debouncedAmount, selectedBank.address);
      } else if (actionMode === ActionType.Repay) {
        if (repayWithCollatOptions) {
          const jupiterQuoteApi = createJupiterApiClient();

          const { setupInstructions, swapInstruction, addressLookupTableAddresses, cleanupInstruction } =
            await jupiterQuoteApi.swapInstructionsPost({
              swapRequest: {
                quoteResponse: repayWithCollatOptions.repayCollatQuote,
                userPublicKey: repayWithCollatOptions.wallet.publicKey.toBase58(),
              },
            });

          const setupIxs = setupInstructions.map(deserializeInstruction);
          const swapIx = deserializeInstruction(swapInstruction);
          const swapcleanupIx = deserializeInstruction(cleanupInstruction);

          const addressLookupTableAccounts: AddressLookupTableAccount[] = [];
          addressLookupTableAccounts.push(
            ...(await getAdressLookupTableAccounts(repayWithCollatOptions.connection, addressLookupTableAddresses))
          );

          simulationResult = await selectedAccount.simulateRepayWithCollat(
            debouncedAmount,
            repayWithCollatOptions.repayAmount,
            selectedBank.address,
            repayWithCollatOptions.repayBank.address,
            selectedBank.isActive && isWholePosition(selectedBank, debouncedAmount),
            [...setupIxs, swapIx, swapcleanupIx],
            addressLookupTableAccounts
          );
        } else {
          simulationResult = await selectedAccount.simulateRepay(
            debouncedAmount,
            selectedBank.address,
            selectedBank.isActive && isWholePosition(selectedBank, debouncedAmount)
          );
        }
      } else {
        throw new Error("Unknown action mode");
      }

      const { assets, liabilities } = simulationResult.marginfiAccount.computeHealthComponents(
        MarginRequirementType.Maintenance
      );
      const { assets: assetsInit } = simulationResult.marginfiAccount.computeHealthComponents(
        MarginRequirementType.Initial
      );
      const health = assets.minus(liabilities).dividedBy(assets).toNumber();

      const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(selectedBank.address);

      const { lendingRate, borrowingRate } = simulationResult.banks
        .get(selectedBank.address.toBase58())!
        .computeInterestRates();

      const position = simulationResult.marginfiAccount.activeBalances.find(
        (b) => b.active && b.bankPk.equals(selectedBank.address)
      );
      let positionAmount = 0;
      if (position && position.liabilityShares.gt(0)) {
        positionAmount = position.computeQuantityUi(selectedBank.info.rawBank).liabilities.toNumber();
      } else if (position && position.assetShares.gt(0)) {
        positionAmount = position.computeQuantityUi(selectedBank.info.rawBank).assets.toNumber();
      }
      const availableCollateral = simulationResult.marginfiAccount.computeFreeCollateral().toNumber();

      setPreview({
        health,
        liquidationPrice,
        depositRate: lendingRate.toNumber(),
        borrowRate: borrowingRate.toNumber(),
        positionAmount,
        availableCollateral: {
          amount: availableCollateral,
          ratio: availableCollateral / assetsInit.toNumber(),
        },
      });
    } catch (error) {
      setPreview(null);
      console.log("Error computing action preview", error);
    } finally {
      setIsLoading(false);
    }
  }, [actionMode, debouncedAmount, selectedAccount, selectedBank]);

  React.useEffect(() => {
    computePreview();
  }, [computePreview, debouncedAmount]);

  return (
    <>
      {selectedAccount && (
        <AvailableCollateral isLoading={isLoading} marginfiAccount={selectedAccount} preview={preview} />
      )}

      {children}

      {isEnabled && selectedBank && (
        <dl className="grid grid-cols-2 gap-y-2 pt-6 text-sm text-white">
          <Stat label={`Your ${showLending ? "deposited" : "borrowed"} amount`}>
            {clampedNumeralFormatter(currentPositionAmount)} {selectedBank.meta.tokenSymbol}
            {preview && <IconArrowRight width={12} height={12} />}
            {preview &&
              preview.positionAmount &&
              clampedNumeralFormatter(preview.positionAmount) + " " + selectedBank.meta.tokenSymbol}
          </Stat>
          <Stat label={"Pool"}>
            {selectedBank.info.state.isIsolated ? (
              <>
                Isolated pool{" "}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image src="/info_icon.png" alt="info" height={12} width={12} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <h4 className="text-base">Isolated pools are risky ⚠️</h4>
                      Assets in isolated pools cannot be used as collateral. When you borrow an isolated asset, you
                      cannot borrow other assets. Isolated pools should be considered particularly risky. As always,
                      remember that marginfi is a decentralized protocol and all deposited funds are at risk.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <>Global pool</>
            )}
          </Stat>

          <Stat style={{ color: healthColor }} label="Health">
            {healthFactor && percentFormatter.format(healthFactor)}
            {healthFactor && preview?.health ? <IconArrowRight width={12} height={12} /> : ""}
            {isLoading ? (
              <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
            ) : preview?.health ? (
              percentFormatter.format(preview.health)
            ) : (
              ""
            )}
          </Stat>
          {(actionMode === ActionType.Borrow || isBorrowing) && preview?.liquidationPrice && (
            <Stat style={{ color: liquidationColor }} label="Liquidation price">
              {selectedBank.isActive &&
                selectedBank.position.liquidationPrice &&
                selectedBank.position.liquidationPrice > 0.01 &&
                usdFormatter.format(selectedBank.position.liquidationPrice)}
              {selectedBank.isActive && selectedBank.position.liquidationPrice && preview?.liquidationPrice && (
                <IconArrowRight width={12} height={12} />
              )}
              {isLoading ? (
                <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
              ) : preview?.liquidationPrice ? (
                usdFormatter.format(preview.liquidationPrice)
              ) : (
                ""
              )}
            </Stat>
          )}
          <Stat label={showLending ? "Global deposits" : "Available"}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "flex items-center justify-end gap-1.5 text-white",
                      (isReduceOnly || isBankHigh) && "text-warning",
                      isBankFilled && "text-destructive-foreground"
                    )}
                  >
                    {numeralFormatter(
                      showLending
                        ? selectedBank.info.state.totalDeposits
                        : Math.max(
                            0,
                            Math.min(
                              selectedBank.info.state.totalDeposits,
                              selectedBank.info.rawBank.config.borrowLimit.toNumber()
                            ) - selectedBank.info.state.totalBorrows
                          )
                    )}

                    {isReduceOnly || (isBankHigh && !isBankFilled) ? (
                      <IconAlertTriangle size={16} />
                    ) : isBankFilled ? (
                      <IconAlertTriangleFilled size={16} />
                    ) : null}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col items-start gap-1">
                    <h4 className="text-base flex items-center gap-1.5">
                      {isReduceOnly ? (
                        <>
                          <IconAlertTriangle size={16} /> Reduce Only
                        </>
                      ) : (
                        isBankHigh &&
                        (isBankFilled ? (
                          <>
                            <IconAlertTriangleFilled size={16} /> Limit Reached
                          </>
                        ) : (
                          <>
                            <IconAlertTriangle size={16} /> Approaching Limit
                          </>
                        ))
                      )}
                    </h4>

                    <p>
                      {isReduceOnly
                        ? "stSOL is being discontinued."
                        : `${selectedBank.meta.tokenSymbol} ${
                            showLending ? "deposits" : "borrows"
                          } are at ${percentFormatter.format(
                            (showLending
                              ? selectedBank.info.state.totalDeposits
                              : selectedBank.info.state.totalBorrows) / bankCap
                          )} capacity.`}
                    </p>
                    <a href="https://docs.marginfi.com">
                      <u>Learn more.</u>
                    </a>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Stat>
        </dl>
      )}
    </>
  );
};

interface StatProps {
  label: string;
  classNames?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
const Stat = ({ label, classNames, children, style }: StatProps) => {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("flex justify-end text-right items-center gap-2", classNames)} style={style}>
        {children}
      </dd>
    </>
  );
};
