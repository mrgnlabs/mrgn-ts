import React from "react";
import { Connection } from "@solana/web3.js";

import { TransactionBroadcastType, TransactionPriorityType } from "@mrgnlabs/mrgn-common";

import { usePrevious } from "../mrgnUtils";
import { getBundleTip, getRpcPriorityFeeMicroLamports, microLamportsToUi } from "../priority.utils";

export const usePriorityFee = (
  priorityType: TransactionPriorityType,
  broadcastType: TransactionBroadcastType,
  maxCap: number,
  connection?: Connection
): number => {
  const prevPriorityType = usePrevious(priorityType);
  const prevBroadcastType = usePrevious(broadcastType);
  const prevMaxCap = usePrevious(maxCap);
  const [priorityFee, setPriorityFee] = React.useState(0);

  const calculatePriorityFeeUi = React.useCallback(
    async (
      priorityType: TransactionPriorityType,
      broadcastType: TransactionBroadcastType,
      maxCap: number,
      connection: Connection
    ) => {
      const fetchPriorityFee = async () => {
        if (broadcastType === "BUNDLE") {
          return await getBundleTip(priorityType);
        } else {
          const priorityFeeMicroLamports = await getRpcPriorityFeeMicroLamports(connection, priorityType);
          return microLamportsToUi(priorityFeeMicroLamports);
        }
      };

      const priorityFeeUi = await fetchPriorityFee();
      if (priorityFeeUi > maxCap) {
        return maxCap;
      }
      return priorityFeeUi;
    },
    [setPriorityFee]
  );

  React.useEffect(() => {
    if (
      connection &&
      (prevPriorityType !== priorityType || prevBroadcastType !== broadcastType || prevMaxCap !== maxCap)
    ) {
      console.log("hit");
      calculatePriorityFeeUi(priorityType, broadcastType, maxCap, connection);
    }
  }, [connection, priorityType, broadcastType, maxCap, calculatePriorityFeeUi]);

  return priorityFee;
};
