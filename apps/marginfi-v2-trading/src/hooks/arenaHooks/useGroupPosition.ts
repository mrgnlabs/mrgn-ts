import React from "react";

import { numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ArenaGroupStatus } from "@mrgnlabs/mrgn-utils";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";

export function useLeveragedPositionDetails({ pool }: { pool: ArenaPoolV2Extended }) {
  const positions = React.useMemo(() => {
    const status = pool.status;

    let depositValue = 0,
      borrowValue = 0,
      depositSize = 0,
      borrowSize = 0;

    if (status === ArenaGroupStatus.SHORT) {
      depositValue = pool.quoteBank.isActive ? pool.quoteBank.position.usdValue : 0;
      borrowValue = pool.tokenBank.isActive ? pool.tokenBank.position.usdValue : 0;
      depositSize = pool.quoteBank.isActive ? pool.quoteBank.position.amount : 0;
    } else if (status === ArenaGroupStatus.LONG) {
      depositValue = pool.tokenBank.isActive ? pool.tokenBank.position.usdValue : 0;
      borrowValue = pool.quoteBank.isActive ? pool.quoteBank.position.usdValue : 0;
      depositSize = pool.tokenBank.isActive ? pool.tokenBank.position.amount : 0;
    }

    const leverage = numeralFormatter(
      Math.round((depositValue / (depositValue - borrowValue) + Number.EPSILON) * 100) / 100
    );

    return { value: depositValue - borrowValue, size: depositValue, tokenSize: depositSize, leverage };
  }, [pool.quoteBank, pool.tokenBank, pool.status]);

  return {
    positionSizeUsd: positions.size,
    positionSizeToken: positions.tokenSize,
    totalUsdValue: positions.value,
    leverage: positions.leverage,
  };
}

// export function useGroupPosition({ group }: { group: GroupData }) {
//   const { borrowBank, depositBank } = useGroupBanks({ group });
//   const positionInfo = React.useMemo(() => getGroupPositionInfo({ group }), [group]);

//   const positions = React.useMemo(() => {
//     const depositValue = depositBank ? depositBank.position.usdValue : 0;
//     const borrowValue = borrowBank ? borrowBank.position.usdValue : 0;
//     const depositSize = depositBank ? depositBank.position.amount : 0;
//     const borrowSize = borrowBank ? borrowBank.position.amount : 0;

//     if (positionInfo === null) {
//       return { value: 0, size: 0, tokenSize: 0, leverage: 0 };
//     } else if (positionInfo === "LP") {
//       return { value: depositValue, size: depositValue, tokenSize: depositSize, leverage: 1 };
//     } else if (positionInfo === "LONG" || positionInfo === "SHORT") {
//       const leverage = numeralFormatter(Math.round((borrowValue / depositValue + Number.EPSILON) * 100) / 100 + 1);
//       return { value: depositValue - borrowValue, size: depositValue, tokenSize: depositSize, leverage };
//     }

//     return { value: 0, size: 0, tokenSize: 0, leverage: 0 };
//   }, [group, positionInfo]);

//   return {
//     positionSizeUsd: positions.size,
//     positionSizeToken: positions.tokenSize,
//     totalUsdValue: positions.value,
//     leverage: positions.leverage,
//   };
// }
