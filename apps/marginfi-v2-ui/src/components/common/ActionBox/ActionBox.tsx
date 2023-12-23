import React, { FC, useEffect, useMemo, useState } from "react";

import { usdFormatterDyn, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";

import { useMrgnlendStore, useUiStore } from "~/store";
import {
  MarginfiActionParams,
  clampedNumeralFormatter,
  closeBalance,
  executeLendingAction,
  getMaintHealthColor,
  isWholePosition,
  usePrevious,
  cn,
} from "~/utils";
import { LendingModes } from "~/types";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useDebounce } from "~/hooks/useDebounce";

import { MrgnLabeledSwitch } from "~/components/common/MrgnLabeledSwitch";
import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";
import { Input } from "~/components/ui/input";
import { IconAlertTriangle, IconInfoCircle, IconWallet, IconSettings } from "~/components/ui/icons";
import {
  checkActionAvailable,
  ActionBoxActions,
  ActionBoxPreview,
  ActionBoxTokens,
  ActionBoxPriorityFees,
} from "~/components/common/ActionBox";

import { MrgnTooltip } from "../MrgnTooltip";
import { MarginfiAccountWrapper, MarginRequirementType, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { Skeleton } from "~/components/ui/skeleton";

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

type ActionBoxProps = {
  requestedAction?: ActionType;
  requestedToken?: PublicKey;
  requestedLendingMode?: LendingModes;
  isDialog?: boolean;
  handleCloseDialog?: () => void;
};

export const ActionBox = ({
  requestedAction,
  requestedToken,
  requestedLendingMode,
  isDialog,
  handleCloseDialog,
}: ActionBoxProps) => {
  const [
    mfiClient,
    nativeSolBalance,
    setIsRefreshingStore,
    fetchMrgnlendState,
    selectedAccount,
    extendedBankInfos,
    isInitialized,
  ] = useMrgnlendStore((state) => [
    state.marginfiClient,
    state.nativeSolBalance,
    state.setIsRefreshingStore,
    state.fetchMrgnlendState,
    state.selectedAccount,
    state.extendedBankInfos,
    state.initialized,
  ]);
  const [lendingModeFromStore, setLendingMode, priorityFee, setPriorityFee, triggerActionSuccess] = useUiStore(
    (state) => [
      state.lendingMode,
      state.setLendingMode,
      state.priorityFee,
      state.setPriorityFee,
      state.triggerActionSuccess,
    ]
  );
  const { walletContextState, connected } = useWalletContext();

  const lendingMode = useMemo(
    () => requestedLendingMode ?? lendingModeFromStore,
    [lendingModeFromStore, requestedLendingMode]
  );

  const [amountRaw, setAmountRaw] = React.useState<string>("");
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);
  const debouncedAmount = useDebounce<number | null>(amount, 500);
  const [isAmountLoading, setIsAmountLoading] = React.useState<boolean>(false);

  const [actionMode, setActionMode] = React.useState<ActionType>(ActionType.Deposit);
  const [selectedTokenBank, setSelectedTokenBank] = React.useState<PublicKey | null>(null);
  const [preview, setPreview] = React.useState<ActionPreview | null>(null);
  const [isPriorityFeesMode, setIsPriorityFeesMode] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [hasLSTDialogShown, setHasLSTDialogShown] = React.useState<LSTDialogVariants[]>([]);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

  const numberFormater = new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 });

  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const hasActivePositions = React.useMemo(() => extendedBankInfos.find((bank) => bank.isActive), [extendedBankInfos]);
  const selectedBank = React.useMemo(
    () =>
      selectedTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(selectedTokenBank)) ?? null
        : null,
    [extendedBankInfos, selectedTokenBank]
  );
  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(() => actionMode === ActionType.Withdraw && isDust, [actionMode, isDust]);
  const maxAmount = React.useMemo(() => {
    if (!selectedBank || !isInitialized) {
      return 0;
    }

    switch (actionMode) {
      case ActionType.Deposit:
        return selectedBank.userInfo.maxDeposit;
      case ActionType.Withdraw:
        return selectedBank.userInfo.maxWithdraw;
      case ActionType.Borrow:
        return selectedBank.userInfo.maxBorrow;
      case ActionType.Repay:
        return selectedBank.userInfo.maxRepay;
      default:
        return 0;
    }
  }, [selectedBank, actionMode, isInitialized]);
  const isInputDisabled = React.useMemo(() => maxAmount === 0 && !showCloseBalance, [maxAmount, showCloseBalance]);
  const walletAmount = React.useMemo(
    () =>
      selectedBank?.info.state.mint?.equals && selectedBank?.info.state.mint?.equals(WSOL_MINT)
        ? selectedBank?.userInfo.tokenAccount.balance + nativeSolBalance
        : selectedBank?.userInfo.tokenAccount.balance,
    [nativeSolBalance, selectedBank]
  );

  const actionMethod = React.useMemo(
    () =>
      checkActionAvailable({
        amount,
        connected,
        showCloseBalance,
        selectedBank,
        extendedBankInfos,
        marginfiAccount: selectedAccount,
        nativeSolBalance,
        actionMode,
      }),
    [
      amount,
      connected,
      showCloseBalance,
      selectedBank,
      extendedBankInfos,
      selectedAccount,
      nativeSolBalance,
      actionMode,
    ]
  );

  const actionModePrev = usePrevious(actionMode);

  const priorityFeeLabel = useMemo(() => {
    if (priorityFee === 0) return "Normal";
    if (priorityFee === 0.00005) return "High";
    if (priorityFee === 0.005) return "Mamas";
    return "Custom";
  }, [priorityFee]);

  React.useEffect(() => {
    if (actionModePrev !== null && actionModePrev !== actionMode) {
      setAmountRaw("");
    }
  }, [actionModePrev, actionMode]);

  React.useEffect(() => {
    setAmountRaw("");
  }, [lendingMode, selectedTokenBank]);

  React.useEffect(() => {
    if (requestedToken) {
      setSelectedTokenBank(requestedToken);
    }
  }, [requestedToken, setSelectedTokenBank]);

  React.useEffect(() => {
    if (!requestedAction) {
      if (lendingMode === LendingModes.LEND) {
        setActionMode(ActionType.Deposit);
      } else {
        setActionMode(ActionType.Borrow);
      }
    }
  }, [lendingMode, setActionMode]);

  React.useEffect(() => {
    if (requestedAction) {
      setActionMode(requestedAction);
    }
  }, [requestedAction, setActionMode]);

  React.useEffect(() => {
    if (amount) {
      setIsAmountLoading(true);
      setIsLoading(true);
    } else {
      setIsAmountLoading(false);
      setIsLoading(false);
    }
  }, [setIsAmountLoading, setIsLoading, amount]);

  React.useEffect(() => {
    if (amount && amount > maxAmount) {
      setAmountRaw(numberFormater.format(maxAmount));
    }
  }, [maxAmount, amount]);

  React.useEffect(() => {
    if (
      actionMode === ActionType.Withdraw &&
      !(selectedBank?.isActive && selectedBank?.position?.isLending && lendingMode === LendingModes.LEND)
    ) {
      setSelectedTokenBank(null);
    } else if (
      actionMode === ActionType.Repay &&
      !(selectedBank?.isActive && !selectedBank?.position?.isLending && lendingMode === LendingModes.BORROW)
    ) {
      setSelectedTokenBank(null);
    }
  }, [selectedBank, actionMode, setActionMode, lendingMode]);

  const computePreview = React.useCallback(async () => {
    if (!selectedAccount || !selectedBank || debouncedAmount === null) {
      setIsAmountLoading(false);
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
        simulationResult = await selectedAccount.simulateRepay(
          debouncedAmount,
          selectedBank.address,
          selectedBank.isActive && isWholePosition(selectedBank, debouncedAmount)
        );
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
      setIsAmountLoading(false);
      setIsLoading(false);
    }
  }, [actionMode, debouncedAmount, selectedAccount, selectedBank]);

  React.useEffect(() => {
    computePreview();
  }, [computePreview, debouncedAmount]);

  const executeLendingActionCb = React.useCallback(
    async ({
      mfiClient,
      actionType: currentAction,
      bank,
      amount: borrowOrLendAmount,
      nativeSolBalance,
      marginfiAccount,
      walletContextState,
    }: MarginfiActionParams) => {
      setIsLoading(true);
      await executeLendingAction({
        mfiClient,
        actionType: currentAction,
        bank,
        amount: borrowOrLendAmount,
        nativeSolBalance,
        marginfiAccount,
        walletContextState,
        priorityFee,
      });

      setIsLoading(false);
      handleCloseDialog && handleCloseDialog();
      setAmountRaw("");
      triggerActionSuccess();

      // -------- Refresh state
      try {
        setIsRefreshingStore(true);
        await fetchMrgnlendState();
      } catch (error: any) {
        console.log("Error while reloading state");
        console.log(error);
      }
    },
    [fetchMrgnlendState, setIsRefreshingStore, priorityFee]
  );

  const handleCloseBalance = React.useCallback(async () => {
    try {
      if (!selectedBank || !selectedAccount) {
        throw new Error();
      }
      await closeBalance({ marginfiAccount: selectedAccount, bank: selectedBank, priorityFee });
    } catch (error) {
      return;
    }

    setAmountRaw("");
    handleCloseDialog && handleCloseDialog();

    try {
      setIsRefreshingStore(true);
      await fetchMrgnlendState();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [selectedBank, selectedAccount, fetchMrgnlendState, setIsRefreshingStore, priorityFee]);

  const handleLendingAction = React.useCallback(async () => {
    if (!actionMode || !selectedBank || !amount) {
      return;
    }

    const action = async () => {
      executeLendingActionCb({
        mfiClient,
        actionType: actionMode,
        bank: selectedBank,
        amount: amount,
        nativeSolBalance,
        marginfiAccount: selectedAccount,
        walletContextState,
      });
    };

    if (
      actionMode === ActionType.Deposit &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL") &&
      !hasLSTDialogShown.includes(selectedBank.meta.tokenSymbol as LSTDialogVariants)
    ) {
      setHasLSTDialogShown((prev) => [...prev, selectedBank.meta.tokenSymbol as LSTDialogVariants]);
      setLSTDialogVariant(selectedBank.meta.tokenSymbol as LSTDialogVariants);
      setIsLSTDialogOpen(true);
      setLSTDialogCallback(() => action);

      return;
    }

    await action();

    if (
      actionMode === ActionType.Withdraw &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL") &&
      !hasLSTDialogShown.includes(selectedBank.meta.tokenSymbol as LSTDialogVariants)
    ) {
      setHasLSTDialogShown((prev) => [...prev, selectedBank.meta.tokenSymbol as LSTDialogVariants]);
      setLSTDialogVariant(selectedBank.meta.tokenSymbol as LSTDialogVariants);
      return;
    }
  }, [
    actionMode,
    selectedBank,
    selectedAccount,
    amount,
    hasLSTDialogShown,
    executeLendingActionCb,
    mfiClient,
    nativeSolBalance,
    walletContextState,
  ]);

  const handleInputChange = React.useCallback(
    (newAmount: string) => {
      let formattedAmount: string, amount: number;
      // Remove commas from the formatted string
      const newAmountWithoutCommas = newAmount.replace(/,/g, "");
      let decimalPart = newAmountWithoutCommas.split(".")[1];
      const mintDecimals = selectedBank?.info.state.mintDecimals ?? 9;

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
        setAmountRaw(numberFormater.format(maxAmount));
      } else {
        setAmountRaw(formattedAmount);
      }
    },
    [maxAmount, setAmountRaw, amount, selectedBank]
  );

  return (
    <>
      <div className="bg-background p-4 flex flex-col items-center gap-4">
        <div className="space-y-6 text-center w-full flex flex-col items-center">
          {!isDialog && (
            <>
              <div className="flex w-[150px] h-[42px]">
                <MrgnLabeledSwitch
                  labelLeft="Lend"
                  labelRight="Borrow"
                  checked={lendingMode === LendingModes.BORROW}
                  onClick={() => {
                    setSelectedTokenBank(null);
                    setLendingMode(lendingMode === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND);
                  }}
                />
              </div>

              <p className="text-muted-foreground">Supply. Earn interest. Borrow. Repeat.</p>
            </>
          )}
        </div>
        <div className="p-6 bg-background-gray text-white w-full max-w-[480px] rounded-xl relative">
          {isPriorityFeesMode && (
            <ActionBoxPriorityFees mode={actionMode} setIsPriorityFeesMode={setIsPriorityFeesMode} />
          )}
          {!isPriorityFeesMode && (
            <>
              <div className="flex flex-row items-center justify-between mb-3">
                {!isDialog ? (
                  <div className="text-lg font-normal flex items-center">
                    {lendingMode === LendingModes.LEND ? "You supply" : "You borrow"}
                  </div>
                ) : (
                  <div />
                )}
                {selectedBank && (
                  <div className="inline-flex gap-1.5 items-center">
                    <IconWallet size={16} />
                    <span className="text-sm font-normal">
                      {walletAmount !== undefined
                        ? clampedNumeralFormatter(walletAmount).concat(" ", selectedBank.meta.tokenSymbol)
                        : "-"}
                    </span>
                    <button
                      className={`text-xs ml-1 h-6 py-1 px-2 flex flex-row items-center justify-center rounded-full border border-background-gray-light bg-transparent text-muted-foreground ${
                        maxAmount === 0 ? "" : "cursor-pointer hover:bg-background-gray-light"
                      } transition-colors`}
                      onClick={() => setAmountRaw(numberFormater.format(maxAmount))}
                      disabled={maxAmount === 0}
                    >
                      MAX
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-background text-3xl rounded-lg flex flex-wrap xs:flex-nowrap gap-3 xs:gap-0 justify-center items-center p-4 font-medium mb-5">
                <div className="w-full xs:w-[162px]">
                  <ActionBoxTokens
                    isDialog={isDialog}
                    currentTokenBank={selectedTokenBank}
                    setCurrentTokenBank={setSelectedTokenBank}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    ref={amountInputRef}
                    inputMode="numeric"
                    value={amountRaw ?? undefined}
                    disabled={isInputDisabled}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="0"
                    className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
                  />
                </div>
              </div>

              {actionMethod.description && (
                <div className="pb-6">
                  <div className="flex items-center space-x-2 py-3 px-4 rounded-xl text-alert-foreground bg-alert">
                    <IconAlertTriangle className="shrink-0" size={18} />
                    <p className="text-alert-foreground">{actionMethod.description}</p>
                  </div>
                </div>
              )}

              {selectedAccount && (
                <ActionBoxAvailableCollateral
                  isLoading={isAmountLoading}
                  marginfiAccount={selectedAccount}
                  preview={preview}
                />
              )}

              <ActionBoxActions
                handleAction={() => (showCloseBalance ? handleCloseBalance() : handleLendingAction())}
                isLoading={isLoading}
                isEnabled={actionMethod.isEnabled}
                actionMode={actionMode}
                disabled={amount === 0}
              />

              <div className="flex justify-end mt-3">
                <button
                  onClick={() => setIsPriorityFeesMode(true)}
                  className="text-xs gap-1 ml-1 h-6 py-1 px-2 flex flex-row items-center justify-center rounded-full border border-background-gray-light bg-transparent hover:bg-background-gray-light text-muted-foreground"
                >
                  Txn priority: {priorityFeeLabel} <IconSettings size={16} />
                </button>
              </div>

              {selectedBank && actionMethod.isEnabled && (
                <ActionBoxPreview
                  isLoading={isAmountLoading}
                  marginfiAccount={selectedAccount}
                  selectedBank={selectedBank}
                  actionMode={actionMode}
                  preview={preview}
                />
              )}
            </>
          )}
        </div>
      </div>
      <LSTDialog
        variant={lstDialogVariant}
        open={isLSTDialogOpen}
        onClose={() => {
          setIsLSTDialogOpen(false);
          setLSTDialogVariant(null);
          if (lstDialogCallback) {
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
      />
    </>
  );
};

const ActionBoxAvailableCollateral: FC<{
  isLoading: boolean;
  marginfiAccount: MarginfiAccountWrapper;
  preview: ActionPreview | null;
}> = ({ isLoading, marginfiAccount, preview }) => {
  const [availableRatio, setAvailableRatio] = React.useState<number>(0);
  const [availableAmount, setAvailableAmount] = React.useState<number>(0);

  const healthColor = React.useMemo(
    () => getMaintHealthColor(preview?.availableCollateral.ratio ?? availableRatio),
    [preview?.health, availableRatio]
  );

  useEffect(() => {
    const currentAvailableCollateralAmount = marginfiAccount.computeFreeCollateral().toNumber();
    const currentAvailableCollateralRatio =
      currentAvailableCollateralAmount /
      marginfiAccount.computeHealthComponents(MarginRequirementType.Initial).assets.toNumber();
    setAvailableAmount(currentAvailableCollateralAmount);
    setAvailableRatio(currentAvailableCollateralRatio);
  }, [marginfiAccount]);

  return (
    <div className="pb-6">
      <dl className="flex justify-between items-center text-muted-foreground  gap-2">
        <dt className="flex items-center gap-1.5 text-sm pb-2">
          Available collateral
          <MrgnTooltip
            title={
              <React.Fragment>
                <div className="flex flex-col gap-2 pb-2">
                  <p>Available collateral is the USD value of your collateral not actively backing a loan.</p>
                  <p>It can be used to open additional borrows or withdraw part of your collateral.</p>
                </div>
              </React.Fragment>
            }
            placement="top"
          >
            <IconInfoCircle size={16} />
          </MrgnTooltip>
        </dt>
        <dd className="text-xl md:text-sm font-bold text-white">
          {isLoading ? (
            <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
          ) : (
            usdFormatterDyn.format(preview?.availableCollateral.amount ?? availableAmount)
          )}
        </dd>
      </dl>
      <div className="h-2 mb-2 bg-background-gray-light">
        <div
          className="h-2"
          style={{
            backgroundColor: `${healthColor}`,
            width: `${(preview?.availableCollateral.ratio ?? availableRatio) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};
