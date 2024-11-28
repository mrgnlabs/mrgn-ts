import React from "react";
import { Connection } from "@solana/web3.js";

import { MaxCapType, TransactionBroadcastType, TransactionPriorityType } from "@mrgnlabs/mrgn-common";

import { usePrevious } from "../mrgnUtils";
import { fetchPriorityFee } from "../priority.utils";
import { PriorityFees } from "@mrgnlabs/marginfi-client-v2";

export const usePriorityFee = (
  priorityType: TransactionPriorityType,
  broadcastType: TransactionBroadcastType,
  maxCapType: MaxCapType,
  maxCap: number,
  connection?: Connection
): PriorityFees => {
  const prevPriorityType = usePrevious(priorityType);
  const prevBroadcastType = usePrevious(broadcastType);
  const prevMaxCap = usePrevious(maxCap);
  const prevMaxCapType = usePrevious(maxCapType);
  const [priorityFee, setPriorityFee] = React.useState<PriorityFees>({
    bundleTipUi: 0.0005,
    priorityFeeMicro: 1, // TODO: adjust this
  });

  const calculatePriorityFeeUi = React.useCallback(
    async (
      priorityType: TransactionPriorityType,
      broadcastType: TransactionBroadcastType,
      maxCap: number,
      maxCapType: MaxCapType,
      connection: Connection
    ) => {
      const priorityFees = await fetchPriorityFee(maxCapType, maxCap, broadcastType, priorityType, connection);

      setPriorityFee(priorityFees);
    },
    [setPriorityFee]
  );

  React.useEffect(() => {
    if (
      connection &&
      (prevPriorityType !== priorityType ||
        prevBroadcastType !== broadcastType ||
        prevMaxCap !== maxCap ||
        prevMaxCapType !== maxCapType)
    ) {
      calculatePriorityFeeUi(priorityType, broadcastType, maxCap, maxCapType, connection);
    }
  }, [
    connection,
    prevBroadcastType,
    priorityType,
    prevBroadcastType,
    broadcastType,
    prevMaxCap,
    maxCap,
    maxCapType,
    prevMaxCapType,
    calculatePriorityFeeUi,
  ]);

  return priorityFee;
};
