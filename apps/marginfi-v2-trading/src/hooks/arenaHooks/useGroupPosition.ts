import React from "react";

import { GroupData } from "~/store/tradeStore";
import { getGroupPositionInfo } from "~/utils";

import { useGroupBanks } from "./useGroupBanks";
import { numeralFormatter } from "@mrgnlabs/mrgn-common";

export function useGroupPosition({ group }: { group: GroupData }) {
  const { borrowBank, depositBank } = useGroupBanks({ group });
  const positionInfo = React.useMemo(() => getGroupPositionInfo({ group }), [group]);

  const positions = React.useMemo(() => {
    const depositValue = depositBank ? depositBank.position.usdValue : 0;
    const borrowValue = borrowBank ? borrowBank.position.usdValue : 0;
    const depositSize = depositBank ? depositBank.position.amount : 0;
    const borrowSize = borrowBank ? borrowBank.position.amount : 0;

    if (positionInfo === null) {
      return { value: 0, size: 0, tokenSize: 0, leverage: 0 };
    } else if (positionInfo === "LP") {
      return { value: depositValue, size: depositValue, tokenSize: depositSize, leverage: 1 };
    } else if (positionInfo === "LONG" || positionInfo === "SHORT") {
      const leverage = numeralFormatter(Math.round((borrowValue / depositValue + Number.EPSILON) * 100) / 100 + 1);
      return { value: depositValue - borrowValue, size: depositValue, tokenSize: depositSize, leverage };
    }

    return { value: 0, size: 0, tokenSize: 0, leverage: 0 };
  }, [group, positionInfo]);

  return {
    positionSizeUsd: positions.size,
    positionSizeToken: positions.tokenSize,
    totalUsdValue: positions.value,
    leverage: positions.leverage,
  };
}
