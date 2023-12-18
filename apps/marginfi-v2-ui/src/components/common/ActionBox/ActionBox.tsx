import React, { FC, useState } from "react";

import { usdFormatterDyn, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";
import { useMrgnlendStore, useUiStore } from "~/store";
import {
  MarginfiActionParams,
  clampedNumeralFormatter,
  closeBalance,
  executeLendingAction,
  isWholePosition,
  usePrevious,
} from "~/utils";
import { LendingModes } from "~/types";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useDebounce } from "~/hooks/useDebounce";

import { MrgnLabeledSwitch } from "~/components/common/MrgnLabeledSwitch";
import { ActionBoxTokens } from "~/components/common/ActionBox/ActionBoxTokens";
import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";
import { Input } from "~/components/ui/input";
import { IconAlertTriangle, IconInfoCircle, IconWallet } from "~/components/ui/icons";

import { ActionBoxPreview } from "./ActionBoxPreview";
import { checkActionAvailable } from "./ActionBox.utils";
import { MrgnTooltip } from "../MrgnTooltip";
import { MarginfiAccountWrapper, MarginRequirementType, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionBoxActions } from "./ActionBoxActions";
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
  isDialog?: boolean;
};

export const ActionBox = ({ requestedAction, requestedToken, isDialog }: ActionBoxProps) => {
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
  const [lendingMode, setLendingMode] = useUiStore((state) => [state.lendingMode, state.setLendingMode]);
  const { walletContextState, connected } = useWalletContext();

  const [amount, setAmount] = React.useState<number | null>(null);
  const debouncedAmount = useDebounce<number | null>(amount, 500)
  const [isAmountLoading, setIsAmountLoading] = React.useState<boolean>(false)

  const [actionMode, setActionMode] = React.useState<ActionType>(ActionType.Deposit);
  const [selectedTokenBank, setSelectedTokenBank] = React.useState<PublicKey | null>(null);
  const [preview, setPreview] = React.useState<ActionPreview | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [hasLSTDialogShown, setHasLSTDialogShown] = React.useState<LSTDialogVariants[]>([]);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

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
  React.useEffect(() => {
    if (actionModePrev !== null && actionModePrev !== actionMode) {
      setAmount(0);
    }
  }, [actionModePrev, actionMode]);

  React.useEffect(() => {
    setAmount(0);
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
    if (selectedBank && amount) {
      setIsAmountLoading(true)
      setIsLoading(true)
    } else {
      setIsAmountLoading(false)
      setIsLoading(false)
    }
  }, [setIsAmountLoading, setIsLoading, amount, selectedBank])

  React.useEffect(() => {

    if (amount && amount > maxAmount) {
      setAmount(maxAmount);
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
      setIsAmountLoading(false)
      setIsLoading(false)
    }
  }, [actionMode, debouncedAmount, selectedAccount, selectedBank]);

  React.useEffect(() => {
    computePreview();
  }, [computePreview]);

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
      });

      setIsLoading(false);
      setAmount(0);

      // -------- Refresh state
      try {
        setIsRefreshingStore(true);
        await fetchMrgnlendState();
      } catch (error: any) {
        console.log("Error while reloading state");
        console.log(error);
      }
    },
    [fetchMrgnlendState, setIsRefreshingStore]
  );

  const handleCloseBalance = React.useCallback(async () => {
    try {
      if (!selectedBank || !selectedAccount) {
        throw new Error();
      }
      await closeBalance({ marginfiAccount: selectedAccount, bank: selectedBank });
    } catch (error) {
      return;
    }

    setAmount(0);

    try {
      setIsRefreshingStore(true);
      await fetchMrgnlendState();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [selectedBank, selectedAccount, fetchMrgnlendState, setIsRefreshingStore]);

  const handleLendingAction = React.useCallback(async () => {
    if (!actionMode || !selectedBank || !selectedAccount || !amount) {
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
    (newAmount: number) => {
      if (newAmount > maxAmount) {
        setAmount(maxAmount);
      } else {
        setAmount(newAmount);
      }
    },
    [maxAmount]
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
        <div className="p-6 bg-background-gray text-white w-full max-w-[480px] rounded-xl">
          <div className="flex flex-row items-baseline justify-between">
            {hasActivePositions && !isDialog ? (
              <div className="text-lg font-normal mb-3">
                {lendingMode === LendingModes.LEND ? "You supply" : "You borrow"}
              </div>
            ) : (
              <div />
            )}
            {selectedBank && (
              <div className="inline-flex gap-2 items-baseline mb-3">
                <div className="h-3.5">
                  <IconWallet size={16} />
                </div>
                <span className="text-sm font-normal">
                  {walletAmount !== undefined
                    ? clampedNumeralFormatter(walletAmount).concat(" ", selectedBank.meta.tokenSymbol)
                    : "-"}
                </span>
                <button
                  className={`text-xs ml-1 h-5 py-1 px-1.5 flex flex-row items-center justify-center border rounded-full border-muted-foreground/30 text-muted-foreground ${maxAmount === 0 ? "" : "cursor-pointer hover:bg-muted-foreground/30"
                    } transition-colors`}
                  onClick={() => setAmount(maxAmount)}
                  disabled={maxAmount === 0}
                >
                  MAX
                </button>
              </div>
            )}
          </div>
          <div className="bg-background text-3xl rounded-lg flex justify-between items-center p-4 font-medium mb-5">
            <ActionBoxTokens
              isDialog={isDialog}
              currentTokenBank={selectedTokenBank}
              setCurrentTokenBank={setSelectedTokenBank}
            />
            <Input
              type="number"
              ref={amountInputRef}
              max={50}
              value={amount ?? undefined}
              disabled={isInputDisabled}
              onChange={(e) => handleInputChange(Number(e.target.value))}
              placeholder="0"
              className="bg-transparent w-full text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
            />
          </div>

          {actionMethod.description && (
            <div className="pb-6">
              <div className="flex items-start space-x-2 py-3 px-4 rounded-xl text-alert-foreground bg-alert">
                <IconAlertTriangle className="shrink-0" size={18} />
                <p className="text-alert-foreground">{actionMethod.description}</p>
              </div>
            </div>
          )}

          {selectedAccount && <ActionBoxAvailableCollateral isLoading={isAmountLoading} marginfiAccount={selectedAccount} preview={preview} />}

          <ActionBoxActions
            handleAction={() => (showCloseBalance ? handleCloseBalance() : handleLendingAction())}
            isLoading={isLoading}
            isEnabled={actionMethod.isEnabled}
            actionMode={actionMode}
            disabled={amount === 0}
          />

          {selectedBank && actionMethod.isEnabled && (
            <ActionBoxPreview
              isLoading={isAmountLoading}
              marginfiAccount={selectedAccount}
              selectedBank={selectedBank}
              actionMode={actionMode}
              preview={preview}
            />
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
  isLoading: boolean
  marginfiAccount: MarginfiAccountWrapper;
  preview: ActionPreview | null;
}> = ({ isLoading, marginfiAccount, preview }) => {
  const currentAvailableCollateralAmount = marginfiAccount.computeFreeCollateral().toNumber();
  const currentAvailableCollateralRatio =
    currentAvailableCollateralAmount /
    marginfiAccount.computeHealthComponents(MarginRequirementType.Initial).assets.toNumber();

  const accentColor = preview
    ? preview.availableCollateral.amount === 0
      ? "#b8b45f"
      : "white"
    : currentAvailableCollateralAmount === 0
      ? "#b8b45f"
      : "white";

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
        <dd className="text-xl md:text-sm font-bold" style={{ color: accentColor }}>
          {isLoading ? <Skeleton className="h-4 w-[45px]" /> : (usdFormatterDyn.format(preview?.availableCollateral.amount ?? currentAvailableCollateralAmount))}
        </dd>
      </dl>
      <div className="h-2 mb-2 bg-background-gray-light">
        <div
          className="h-2"
          style={{
            backgroundColor: "#75BA80",
            width: `${(preview?.availableCollateral.ratio ?? currentAvailableCollateralRatio) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};
