import React from "react";

import { computeMaxLeverage, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { useFlashLoanBoxStore } from "../store";
import { calculateMaxRepayableCollateral, STATIC_SIMULATION_ERRORS } from "@mrgnlabs/mrgn-utils";
import { useActionBoxStore } from "../../../store";
import { useConnection } from "~/hooks/useConnection";
import { calculateLooping } from "../utils";

export function useFlashLoanSimulation(
  amount: number,
  debouncedAmount: number,
  selectedAccount: MarginfiAccountWrapper | null,
  accountSummary?: AccountSummary
) {
  const [selectedBank, selectedSecondaryBank, leverage, amountRaw] = useFlashLoanBoxStore((state) => [
    state.selectedBank,
    state.selectedSecondaryBank,
    state.leverage,
    state.amountRaw,
  ]);
  const [slippageBps, priorityFee] = useActionBoxStore((state) => [state.slippageBps, state.priorityFee]);
  const { connection } = useConnection();

  const fetchLoopingObject = React.useCallback(async () => {
    if (selectedBank && selectedSecondaryBank && selectedAccount) {
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
      } else {
        const errorMessage = loopingObject?.description ?? STATIC_SIMULATION_ERRORS.FL_FAILED;
      }
    }
  }, [selectedBank, selectedSecondaryBank, slippageBps, selectedAccount, connection, priorityFee, leverage, amount]);

  const fetchMaxRepayableCollateral = React.useCallback(async () => {
    if (selectedBank && selectedSecondaryBank) {
      const maxAmount = await calculateMaxRepayableCollateral(selectedBank, selectedSecondaryBank, slippageBps);
      return maxAmount;
    }
    return 0;
  }, [selectedBank, selectedSecondaryBank, slippageBps]);

  const fetchMaxLeverage = React.useCallback(() => {
    if (selectedBank && selectedSecondaryBank) {
      const { maxLeverage, ltv } = computeMaxLeverage(selectedBank.info.rawBank, selectedSecondaryBank.info.rawBank);
      return { maxLeverage };
    }
    return { maxLeverage: 0 };
  }, [selectedBank, selectedSecondaryBank]);
}
