import React from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { QuoteResponse } from "@jup-ag/api";

import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMethod,
  calculateMaxRepayableCollateral,
  DYNAMIC_SIMULATION_ERRORS,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "../../../store";
import { calculateRepayCollateral, calculateSummary, getSimulationResult } from "../utils";

type RepayCollatSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionTxns: {
    actionTxn: VersionedTransaction | null;
    additionalTxns: (VersionedTransaction | Transaction)[];
  };
  simulationResult: SimulationResult | null;

  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionQuote: (actionQuote: QuoteResponse | null) => void;
  setActionTxns: (actionTxns: {
    actionTxn: VersionedTransaction | null;
    additionalTxns: (VersionedTransaction | Transaction)[];
  }) => void;
  setErrorMessage: (error: ActionMethod) => void;
  setRepayAmount: (repayAmount: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  setMaxAmountCollateral: (maxAmountCollateral: number) => void;
};

export function useRepayCollatSimulation({
  debouncedAmount,
  selectedAccount,
  marginfiClient,
  accountSummary,
  selectedBank,
  selectedSecondaryBank,
  actionTxns,
  simulationResult,
  setSimulationResult,
  setActionQuote,
  setActionTxns,
  setErrorMessage,
  setRepayAmount,
  setIsLoading,
  setMaxAmountCollateral,
}: RepayCollatSimulationProps) {
  const [slippageBps, priorityFee] = useActionBoxStore((state) => [state.slippageBps, state.priorityFee]);

  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevSelectedSecondaryBank = usePrevious(selectedSecondaryBank);
  const prevActionTxn = usePrevious(actionTxns?.actionTxn);

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      try {
        if (selectedAccount && selectedBank && txns.length > 0) {
          const simulationResult = await getSimulationResult({
            account: selectedAccount,
            bank: selectedBank,
            txns,
          });

          setSimulationResult(simulationResult.simulationResult);
        } else {
          setSimulationResult(null);
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
        setSimulationResult(null);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAccount, selectedBank, setSimulationResult]
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

  const fetchRepayTxn = React.useCallback(
    async (amount: number) => {
      if (!selectedAccount || !marginfiClient || !selectedBank || !selectedSecondaryBank || amount === 0) {
        const missingParams = [];
        if (!selectedAccount) missingParams.push("account is null");
        if (amount === 0) missingParams.push("amount is 0");
        if (!selectedBank) missingParams.push("bank is null");

        // console.error(`Can't simulate transaction: ${missingParams.join(", ")}`);
        setActionTxns({ actionTxn: null, additionalTxns: [] });
        return;
      }

      setIsLoading(true);
      try {
        const repayObject = await calculateRepayCollateral(
          selectedAccount,
          selectedBank,
          selectedSecondaryBank,
          amount,
          slippageBps,
          marginfiClient.provider.connection,
          priorityFee
        );

        if (repayObject && "repayTxn" in repayObject) {
          const actionTxns = {
            actionTxn: repayObject.repayTxn,
            additionalTxns: repayObject.feedCrankTxs,
          };
          const actionQuote = repayObject.quote;
          const amountRaw = repayObject.amount.toString();

          console.log("amountRaw", amountRaw);
          // setRepayAmount(amountRaw);
          setActionQuote(actionQuote);
          setActionTxns(actionTxns);
        } else {
          const errorMessage =
            repayObject ?? DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(selectedSecondaryBank.meta.tokenSymbol);
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
      marginfiClient,
      priorityFee,
      setRepayAmount,
      setActionQuote,
      setActionTxns,
      setErrorMessage,
    ]
  );

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
  }, [selectedBank, selectedSecondaryBank, slippageBps, setErrorMessage, setMaxAmountCollateral]);

  React.useEffect(() => {
    // only simulate when amount changes
    if (prevDebouncedAmount !== debouncedAmount) {
      fetchRepayTxn(debouncedAmount ?? 0);
    }
  }, [prevDebouncedAmount, debouncedAmount, fetchRepayTxn]);

  React.useEffect(() => {
    handleSimulation([
      ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
      ...(actionTxns?.additionalTxns ?? []),
    ]);
  }, [actionTxns]);

  // Fetch max repayable collateral or max leverage based when the secondary bank changes
  React.useEffect(() => {
    if (!selectedSecondaryBank) {
      return;
    }
    const hasBankChanged = !prevSelectedSecondaryBank?.address.equals(selectedSecondaryBank.address);
    if (hasBankChanged) {
      fetchMaxRepayableCollateral();
    }
  }, [selectedSecondaryBank, prevSelectedSecondaryBank, fetchMaxRepayableCollateral]);

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSummary,
  };
}
