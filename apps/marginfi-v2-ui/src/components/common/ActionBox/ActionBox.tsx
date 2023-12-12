import React, { FC, useEffect } from "react";

import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { WSOL_MINT, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useMrgnlendStore, useUiStore } from "~/store";
import { MarginfiActionParams, closeBalance, cn, executeLendingAction, isWholePosition } from "~/utils";
import { LendingModes } from "~/types";
import { useWalletContext } from "~/hooks/useWalletContext";

import { MrgnLabeledSwitch } from "~/components/common/MrgnLabeledSwitch";
import { ActionBoxTokens } from "~/components/common/ActionBox/ActionBoxTokens";
import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";

import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { IconWallet } from "~/components/ui/icons";

import { ActionBoxActions } from "./ActionBoxActions";
import { Bank, MarginRequirementType, MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";

export const ActionBox = () => {
  const [mfiClient, nativeSolBalance, setIsRefreshingStore, fetchMrgnlendState, selectedAccount, extendedBankInfos, isInitialized] =
    useMrgnlendStore((state) => [
      state.marginfiClient,
      state.nativeSolBalance,
      state.setIsRefreshingStore,
      state.fetchMrgnlendState,
      state.selectedAccount,
      state.extendedBankInfos,
      state.initialized,
    ]);
  const [lendingMode, setLendingMode, actionMode, setActionMode, selectedToken, setSelectedToken] = useUiStore(
    (state) => [
      state.lendingMode,
      state.setLendingMode,
      state.actionMode,
      state.setActionMode,
      state.selectedToken,
      state.setSelectedToken,
    ]
  );

  const { walletContextState } = useWalletContext();

  const [isLoading, setIsLoading] = React.useState(false);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [hasLSTDialogShown, setHasLSTDialogShown] = React.useState<LSTDialogVariants[]>([]);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

  const [amount, setAmount] = React.useState<number | null>(null);
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const isDust = React.useMemo(() => selectedToken?.isActive && selectedToken?.position.isDust, [selectedToken]);
  const showCloseBalance = React.useMemo(() => actionMode === ActionType.Withdraw && isDust, [actionMode, isDust]);
  const maxAmount = React.useMemo(() => {
    if (!selectedToken || !isInitialized) {
      return 0;
    }
    const relevantBank = extendedBankInfos.find((bank) => bank.address.equals(selectedToken?.address));
    if (!relevantBank) {
      return 0;
    }

    switch (actionMode) {
      case ActionType.Deposit:
        return relevantBank.userInfo.maxDeposit;
      case ActionType.Withdraw:
        return relevantBank.userInfo.maxWithdraw;
      case ActionType.Borrow:
        return relevantBank.userInfo.maxBorrow;
      case ActionType.Repay:
        return relevantBank.userInfo.maxRepay;
      default:
        return 0;
    }
  }, [selectedToken, actionMode, extendedBankInfos, isInitialized]);
  const isInputDisabled = React.useMemo(() => maxAmount === 0 && !showCloseBalance, [maxAmount, showCloseBalance]);
  const walletAmount = React.useMemo(
    () =>
      selectedToken?.info.state.mint?.equals && selectedToken?.info.state.mint?.equals(WSOL_MINT)
        ? selectedToken?.userInfo.tokenAccount.balance + nativeSolBalance
        : selectedToken?.userInfo.tokenAccount.balance,
    [selectedToken]
  );
  const hasActivePosition = React.useMemo(
    () =>
      selectedToken?.isActive &&
      ((selectedToken.position.isLending && lendingMode === LendingModes.LEND) ||
        (!selectedToken.position.isLending && lendingMode === LendingModes.BORROW)),
    [selectedToken, lendingMode]
  );

  React.useEffect(() => {
    setAmount(0);
  }, [lendingMode, selectedToken]);

  const liquidationPrice = React.useMemo(() => {
    const isActive = selectedToken?.isActive;
    const isLending = lendingMode === LendingModes.LEND;
    let liquidationPrice = 0;

    if (isActive) {
      if (!amount || amount === 0 || isLending || !selectedAccount || !selectedToken) {
        liquidationPrice = selectedToken?.position.liquidationPrice ?? 0;
      } else {
        const borrowed = selectedToken?.position.amount ?? 0;

        liquidationPrice =
          selectedAccount.computeLiquidationPriceForBankAmount(selectedToken?.address, isLending, amount + borrowed) ??
          0;
      }
    }

    return liquidationPrice;
  }, [selectedToken, amount, lendingMode]);

  const healthColorLiquidation = React.useMemo(() => {
    const isActive = selectedToken?.isActive;

    if (isActive) {
      const price = selectedToken.info.oraclePrice.price.toNumber();
      const safety = liquidationPrice / price;
      let color: string;
      if (safety >= 0.5) {
        color = "#75BA80"; // green color " : "#",
      } else if (safety >= 0.25) {
        color = "#B8B45F"; // yellow color
      } else {
        color = "#CF6F6F"; // red color
      }

      return color;
    } else {
      return "#fff";
    }
  }, [selectedToken, liquidationPrice]);

  React.useEffect(() => {
    if (!selectedToken || !amountInputRef.current) return;
    setAmount(0);
    amountInputRef.current.focus();
  }, [selectedToken, setAmount]);

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
      if (!selectedToken || !selectedAccount) {
        throw new Error();
      }
      await closeBalance({ marginfiAccount: selectedAccount, bank: selectedToken });
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
  }, [selectedToken, selectedAccount, fetchMrgnlendState, setIsRefreshingStore]);

  const handleLendingAction = React.useCallback(async () => {
    if (!actionMode || !selectedToken || !selectedAccount || !amount) {
      return;
    }

    const action = async () => {
      executeLendingActionCb({
        mfiClient,
        actionType: actionMode,
        bank: selectedToken,
        amount: amount,
        nativeSolBalance,
        marginfiAccount: selectedAccount,
        walletContextState,
      });
    };

    if (
      actionMode === ActionType.Deposit &&
      (selectedToken.meta.tokenSymbol === "SOL" || selectedToken.meta.tokenSymbol === "stSOL") &&
      !hasLSTDialogShown.includes(selectedToken.meta.tokenSymbol as LSTDialogVariants)
    ) {
      setHasLSTDialogShown((prev) => [...prev, selectedToken.meta.tokenSymbol as LSTDialogVariants]);
      setLSTDialogVariant(selectedToken.meta.tokenSymbol as LSTDialogVariants);
      setIsLSTDialogOpen(true);
      setLSTDialogCallback(() => action);

      return;
    }

    await action();

    if (
      actionMode === ActionType.Withdraw &&
      (selectedToken.meta.tokenSymbol === "SOL" || selectedToken.meta.tokenSymbol === "stSOL") &&
      !hasLSTDialogShown.includes(selectedToken.meta.tokenSymbol as LSTDialogVariants)
    ) {
      setHasLSTDialogShown((prev) => [...prev, selectedToken.meta.tokenSymbol as LSTDialogVariants]);
      setLSTDialogVariant(selectedToken.meta.tokenSymbol as LSTDialogVariants);
      return;
    }
  }, [
    actionMode,
    selectedToken,
    executeLendingActionCb,
    mfiClient,
    amount,
    nativeSolBalance,
    selectedAccount,
    walletContextState,
  ]);

  return (
    <>
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
          <p className="text-muted-foreground">Supply. Earn interest. Borrow. Repeat.</p>
        </div>
        <div className="p-6 bg-background-gray text-white w-full max-w-[480px] rounded-xl">
          <div className="flex flex-row items-baseline justify-between">
            {hasActivePosition ? (
              <Select
                value={actionMode}
                disabled={!hasActivePosition}
                onValueChange={(value) => {
                  setActionMode(value as ActionType);
                }}
              >
                <SelectTrigger
                  className="w-[160px] h-[35px] bg-background-gray-light border-none mb-3 focus:ring-0 focus:outline-none"
                  icon={<ChevronDownIcon className="h-5 w-5 opacity-70" />}
                >
                  <div className="flex items-center gap-2">
                    <SelectValue defaultValue={LendingModes.LEND} placeholder="Select pools" />
                  </div>
                </SelectTrigger>

                {lendingMode === LendingModes.LEND ? (
                  <SelectContent className="bg-background-gray">
                    <SelectItem value={ActionType.Deposit}>You supply</SelectItem>
                    <SelectItem value={ActionType.Withdraw}>You withdraw</SelectItem>
                  </SelectContent>
                ) : (
                  <SelectContent>
                    <SelectItem value={ActionType.Borrow}>You borrow</SelectItem>
                    <SelectItem value={ActionType.Repay}>You repay</SelectItem>
                  </SelectContent>
                )}
              </Select>
            ) : (
              <p className="text-lg mb-3">You {lendingMode === LendingModes.LEND ? "supply" : "borrow"}</p>
            )}
            {selectedToken && (
              <div className="inline-flex gap-2 items-baseline">
                <div className="h-3.5">
                  <IconWallet size={16} />
                </div>
                <span className="text-sm font-normal">
                  {(walletAmount && walletAmount > 0.01
                    ? numeralFormatter(walletAmount)
                    : walletAmount == 0
                    ? "0"
                    : "< 0.01"
                  ).concat(" ", selectedToken?.meta.tokenSymbol)}
                </span>
                <div onClick={() => setAmount(maxAmount)} className="text-base font-bold cursor-pointer">
                  MAX
                </div>
              </div>
            )}
          </div>
          <div className="bg-background text-3xl rounded-lg flex justify-between items-center p-4 font-medium mb-5">
            <ActionBoxTokens currentToken={selectedToken} setCurrentToken={setSelectedToken} />
            <Input
              type="number"
              ref={amountInputRef}
              value={amount!}
              disabled={isInputDisabled}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
              className="bg-transparent w-full text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-3xl font-medium"
            />
          </div>
          <ActionBoxActions
            amount={amount ?? 0}
            maxAmount={maxAmount}
            showCloseBalance={showCloseBalance ?? false}
            handleAction={() => (showCloseBalance ? handleCloseBalance() : handleLendingAction())}
            isLoading={isLoading}
          />
          <ActionPreview
            marginfiAccount={selectedAccount}
            healthColorLiquidation={healthColorLiquidation}
            selectedToken={selectedToken}
            actionAmount={amount}
            actionMode={actionMode}
            extendedBankInfos={extendedBankInfos}
          />
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

interface ActionPreview {
  health: number;
  liquidationPrice: number | null;
  depositRate: number;
  borrowRate: number;
} // TODO: to extend with any other fields we want to display

const ActionPreview: FC<{
  marginfiAccount: MarginfiAccountWrapper | null;
  healthColorLiquidation: string;
  selectedToken: ExtendedBankInfo | null;
  actionAmount: number | null;
  actionMode: ActionType;
  extendedBankInfos: ExtendedBankInfo[];
}> = ({ marginfiAccount, healthColorLiquidation, selectedToken, actionAmount, actionMode, extendedBankInfos }) => {
  const [preview, setPreview] = React.useState<ActionPreview | null>(null);

  useEffect(() => {
    const computePreview = async () => {
      if (!marginfiAccount || !selectedToken || !actionAmount) {
        return;
      }

      const targetBank = extendedBankInfos.find((bank) => bank.address.equals(selectedToken?.address))!;
      try {
        let simulationResult: SimulationResult;
        if (actionMode === ActionType.Deposit) {
          simulationResult = await marginfiAccount.simulateDeposit(actionAmount, selectedToken.address);
        } else if (actionMode === ActionType.Withdraw) {
          simulationResult = await marginfiAccount.simulateWithdraw(actionAmount, selectedToken.address, targetBank.isActive && isWholePosition(targetBank, actionAmount));
        } else if (actionMode === ActionType.Borrow) {
          simulationResult = await marginfiAccount.simulateBorrow(actionAmount, selectedToken.address);
        } else if (actionMode === ActionType.Repay) {
          simulationResult = await marginfiAccount.simulateRepay(actionAmount, selectedToken.address, targetBank.isActive && isWholePosition(targetBank, actionAmount));
        } else {
          throw new Error("Unknown action mode");
        }

        const { assets, liabilities } = simulationResult.marginfiAccount.computeHealthComponents(
          MarginRequirementType.Maintenance
        );
        const health = assets.minus(liabilities).dividedBy(assets).toNumber();
        const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBankAmount(
          selectedToken.address,
          actionMode === ActionType.Deposit || actionMode === ActionType.Withdraw,
          actionAmount
        );
        const { lendingRate, borrowingRate } = simulationResult.banks
          .get(selectedToken.address.toBase58())!
          .computeInterestRates();
        setPreview({
          health,
          liquidationPrice,
          depositRate: lendingRate.toNumber(),
          borrowRate: borrowingRate.toNumber(),
        });
      } catch (error) {
        setPreview(null);
        console.log("Error computing action preview", error);
      }
    };

    // TODO 1: debounce that call on actionAmount change
    // TODO 2: this effect seems to be called periodically (more frequently than full state refetch it seems)
    computePreview();
  }, [actionAmount, actionMode, marginfiAccount, selectedToken]);

  if (!selectedToken || !marginfiAccount || !actionAmount) {
    return null;
  }

  const isBorrowing = marginfiAccount.activeBalances.find(b => b.active && b.liabilityShares.gt(0)) !== undefined;
  console.log("isBorrowing", isBorrowing)
  console.log(actionMode === ActionType.Borrow)
  return (
    <dl className="grid grid-cols-2 text-muted-foreground gap-y-2 mt-4 text-sm">
      <>
        <dt>Health</dt>
        <dd className={cn(`text-[white] font-medium text-right`)}>
          {preview ? percentFormatter.format(preview.health) : "-"}
        </dd>
      </>
      {(actionMode === ActionType.Borrow || isBorrowing) && <>
        <dt>Liquidation price</dt>
        <dd className={cn(`text-[${healthColorLiquidation}] font-medium text-right`)}>
          {preview && preview.liquidationPrice ? numeralFormatter(preview.liquidationPrice) : "-"}
        </dd>
      </>}
      {actionMode === ActionType.Deposit || actionMode === ActionType.Withdraw ? (
        <>
          <dt>Deposit rate</dt>
          <dd className={cn(`text-[white] font-medium text-right`)}>
            {preview ? percentFormatter.format(preview.depositRate) : "-"}
          </dd>
        </>
      ) : (
        <>
          <dt>Borrow rate</dt>
          <dd className={cn(`text-[white] font-medium text-right`)}>
            {preview ? percentFormatter.format(preview.borrowRate) : "-"}
          </dd>
        </>
      )}
    </dl>
  );
};
