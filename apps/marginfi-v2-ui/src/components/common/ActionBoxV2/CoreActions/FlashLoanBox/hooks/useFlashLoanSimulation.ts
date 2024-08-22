import React from "react";

import {
  computeMaxLeverage,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import { useFlashLoanBoxStore } from "../store";
import {
  calculateMaxRepayableCollateral,
  DYNAMIC_SIMULATION_ERRORS,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { useActionBoxStore } from "../../../store";
import { useConnection } from "~/hooks/useConnection";
import { calculateLooping, calculateRepayCollateral, calculateSummary, getSimulationResult } from "../utils";
import { AccountSummary, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { VersionedTransaction } from "@solana/web3.js";

export function useFlashLoanSimulation(
  debouncedRepayAmount: number,
  debouncedAmount: number,
  selectedAccount: MarginfiAccountWrapper | null,
  marginfiClient: MarginfiClient,
  accountSummary?: AccountSummary
) {
  const [
    selectedBank,
    selectedSecondaryBank,
    leverage,
    actionMode,
    actionTxns,
    simulationResult,
    setSimulationResult,
    setActionQuote,
    setActionTxns,
    setErrorMessage,
    setRepayAmount,
    setLoopingAmounts,
    setMaxLeverage,
    setIsLoading,
  ] = useFlashLoanBoxStore((state) => [
    state.selectedBank,
    state.selectedSecondaryBank,
    state.leverage,
    state.actionMode,
    state.actionTxns,
    state.simulationResult,
    state.setSimulationResult,
    state.setActionQuote,
    state.setActionTxns,
    state.setErrorMessage,
    state.setRepayAmount,
    state.setLoopingAmounts,
    state.setMaxLeverage,
    state.setIsLoading,
  ]);
  const [slippageBps, priorityFee] = useActionBoxStore((state) => [state.slippageBps, state.priorityFee]);
  const { connection } = useConnection();

  const debouncedLeverage = useAmountDebounce<number>(leverage, 500);
  const prevDebouncedLeverage = usePrevious(debouncedLeverage);

  const prevSelectedSecondaryBank = usePrevious(selectedSecondaryBank);
  const prevSelectedBank = usePrevious(selectedBank);

  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevDebouncedRepayAmount = usePrevious(debouncedRepayAmount);

  const prevActionTxn = usePrevious(actionTxns?.actionTxn);

  const [maxAmountCollateral, setMaxAmountCollateral] = React.useState<number | undefined>(undefined);

  const handleSimulation = React.useCallback(
    async (txn: VersionedTransaction | null) => {
      if (selectedAccount && selectedBank && txn) {
        console.log("simulating");
        const simulationResult = await getSimulationResult({
          actionMode: actionMode,
          account: selectedAccount,
          bank: selectedBank,
          marginfiClient: marginfiClient,
          actionTxn: txn || null,
        });

        setSimulationResult(simulationResult.simulationResult);
      } else {
        setSimulationResult(null);
      }
    },
    [selectedAccount, selectedBank, actionMode, marginfiClient, setSimulationResult]
  );

  const handleActionSummary = React.useCallback(
    (summary?: AccountSummary, result?: SimulationResult) => {
      if (selectedAccount && summary && selectedBank) {
        return calculateSummary({
          simulationResult: result ?? undefined,
          bank: selectedBank,
          accountSummary: summary,
        });
      }
    },
    [selectedAccount, selectedBank]
  );

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  React.useEffect(() => {
    handleSimulation(actionTxns?.actionTxn ?? null);
  }, [actionTxns, handleSimulation]);

  React.useEffect(() => {
    const prevAction = prevActionTxn?.serialize().length;
    const currentAction = actionTxns.actionTxn?.serialize().length;

    if (prevAction !== currentAction) {
      handleSimulation(actionTxns.actionTxn);
    }
  }, [actionTxns, handleSimulation, prevActionTxn]);

  const fetchRepayCollateralObject = React.useCallback(
    async (amount: number) => {
      if (!selectedBank || !selectedSecondaryBank || !selectedAccount) {
        return;
      }

      if (amount === 0) {
        return;
      }

      setIsLoading(true);
      try {
        const repayCollat = await calculateRepayCollateral(
          selectedAccount,
          selectedBank,
          selectedSecondaryBank,
          amount,
          slippageBps,
          connection,
          priorityFee
        );

        if (repayCollat && "repayTxn" in repayCollat) {
          const actionTxns = {
            actionTxn: repayCollat.repayTxn,
            bundleTipTxn: repayCollat.bundleTipTxn,
          };
          const actionQuote = repayCollat.quote;
          const amountRaw = repayCollat.amount.toString();

          setRepayAmount(amount);
          setActionQuote(actionQuote);
          setActionTxns(actionTxns);
        } else {
          const errorMessage =
            repayCollat ?? DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(selectedSecondaryBank.meta.tokenSymbol);

          setErrorMessage(errorMessage);
        }
      } catch (error) {
        setErrorMessage(STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED);
      } finally {
        setIsLoading(false);
      }
    },
    [
      selectedBank,
      selectedSecondaryBank,
      selectedAccount,
      setIsLoading,
      slippageBps,
      connection,
      priorityFee,
      setRepayAmount,
      setActionQuote,
      setActionTxns,
      setErrorMessage,
    ]
  );

  const fetchLoopingObject = React.useCallback(
    async (amount: number) => {
      if (!selectedBank || !selectedSecondaryBank || !selectedAccount) {
        return;
      }

      if (amount === 0 || leverage === 0) {
        return;
      }

      setIsLoading(true);
      try {
        const loopingObject = await calculateLooping(
          selectedAccount,
          selectedBank,
          selectedSecondaryBank,
          leverage,
          amount,
          slippageBps,
          connection,
          priorityFee
        );

        if (loopingObject && "loopingTxn" in loopingObject) {
          const actionTxns = {
            actionTxn: loopingObject.loopingTxn,
            bundleTipTxn: loopingObject.bundleTipTxn,
          };

          const actionQuote = loopingObject.quote;
          const loopingAmounts = {
            borrowAmount: loopingObject.borrowAmount,
            actualDepositAmount: loopingObject.actualDepositAmount,
          };

          setLoopingAmounts(loopingAmounts);
          setActionQuote(actionQuote);
          setActionTxns(actionTxns);
        } else {
          const errorMessage = loopingObject ?? STATIC_SIMULATION_ERRORS.FL_FAILED;

          setErrorMessage(errorMessage);
        }
      } catch (error) {
        setErrorMessage(STATIC_SIMULATION_ERRORS.FL_FAILED);
      } finally {
        setIsLoading(false);
      }
    },
    [
      selectedBank,
      selectedSecondaryBank,
      selectedAccount,
      leverage,
      setIsLoading,
      slippageBps,
      connection,
      priorityFee,
      setLoopingAmounts,
      setActionQuote,
      setActionTxns,
      setErrorMessage,
    ]
  );

  // Fetch the looping object based on the leverage change
  React.useEffect(() => {
    const isLeverageChanged = prevDebouncedLeverage !== debouncedLeverage;
    const isAmountChanged = prevDebouncedAmount !== debouncedAmount;

    if (!isAmountChanged && isLeverageChanged) {
      fetchLoopingObject(debouncedAmount);
    }
  }, [prevDebouncedLeverage, debouncedLeverage, fetchLoopingObject, prevDebouncedAmount, debouncedAmount]);

  // Fetch the action object based on the action mode
  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      if (actionMode === ActionType.RepayCollat) {
        fetchRepayCollateralObject(debouncedAmount);
      } else if (actionMode === ActionType.Loop) {
        fetchLoopingObject(debouncedAmount);
      }
    }
  }, [prevDebouncedAmount, debouncedAmount, actionMode, fetchRepayCollateralObject, fetchLoopingObject]);

  const fetchMaxRepayableCollateral = React.useCallback(async () => {
    if (selectedBank && selectedSecondaryBank) {
      const maxAmount = await calculateMaxRepayableCollateral(selectedBank, selectedSecondaryBank, slippageBps);

      if (!maxAmount) {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(
          selectedSecondaryBank.meta.tokenSymbol
        );

        setErrorMessage(errorMessage);
      } else {
        setMaxAmountCollateral(maxAmount);
      }
    }
  }, [selectedBank, selectedSecondaryBank, slippageBps, setErrorMessage]);

  const fetchMaxLeverage = React.useCallback(() => {
    if (selectedBank && selectedSecondaryBank) {
      const maxLeverage = computeMaxLeverage(selectedBank.info.rawBank, selectedSecondaryBank.info.rawBank).maxLeverage;
      setMaxLeverage(maxLeverage);
    }
  }, [selectedBank, selectedSecondaryBank, setMaxLeverage]);

  // Fetch max repayable collateral or max leverage based when the secondary bank changes
  React.useEffect(() => {
    if (!selectedSecondaryBank) {
      return;
    }

    const hasBankChanged = !prevSelectedSecondaryBank?.address.equals(selectedSecondaryBank.address);

    if (hasBankChanged) {
      if (actionMode === ActionType.RepayCollat) {
        fetchMaxRepayableCollateral();
      } else if (actionMode === ActionType.Loop) {
        fetchMaxLeverage();
      }
    }
  }, [selectedSecondaryBank, prevSelectedSecondaryBank, actionMode, fetchMaxRepayableCollateral, fetchMaxLeverage]);

  return {
    actionSummary,
    maxAmountCollateral,
  };
}
