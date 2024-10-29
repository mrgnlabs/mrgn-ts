import React from "react";
import { Connection } from "@solana/web3.js";

import { TransactionBroadcastType, TransactionPriorityType } from "@mrgnlabs/mrgn-common";

import { usePrevious } from "../mrgnUtils";
import {
  DEFAULT_PRIORITY_FEE_MAX_CAP,
  getBundleTip,
  getRpcPriorityFeeMicroLamports,
  microLamportsToUi,
} from "../priority.utils";

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

      if (priorityFeeUi > (maxCap || DEFAULT_PRIORITY_FEE_MAX_CAP)) {
        setPriorityFee(maxCap || DEFAULT_PRIORITY_FEE_MAX_CAP);
      }
      setPriorityFee(priorityFeeUi);
    },
    [setPriorityFee]
  );

  React.useEffect(() => {
    if (
      connection &&
      (prevPriorityType !== priorityType || prevBroadcastType !== broadcastType || prevMaxCap !== maxCap)
    ) {
      calculatePriorityFeeUi(priorityType, broadcastType, maxCap, connection);
    }
  }, [
    connection,
    prevBroadcastType,
    priorityType,
    prevBroadcastType,
    broadcastType,
    prevMaxCap,
    maxCap,
    calculatePriorityFeeUi,
  ]);

  return priorityFee;
};
