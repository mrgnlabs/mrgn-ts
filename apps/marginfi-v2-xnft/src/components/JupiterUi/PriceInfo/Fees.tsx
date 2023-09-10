import React from "react";
import { RouteInfo } from "@jup-ag/react-hook";

import Decimal from "decimal.js";
import { formatNumber } from "~/utils";
import { View, Text } from "react-native";
import tw from "~/styles/tailwind";
import { useJupiterStore } from "~/store";

interface props {
  marketInfos: RouteInfo["marketInfos"] | undefined;
}

export const Fees = ({ marketInfos }: props) => {
  const [tokenMap] = useJupiterStore((state) => [state.tokenMap]);

  if (!marketInfos || (marketInfos && marketInfos.length === 0)) {
    return null;
  }

  return (
    <>
      {marketInfos.map((item, idx) => {
        const tokenMint = tokenMap.get(item.lpFee.mint);
        const decimals = tokenMint?.decimals ?? 6;

        const feeAmount = formatNumber.format(
          new Decimal(item.lpFee.amount.toString()).div(Math.pow(10, decimals)).toNumber()
        );

        return (
          <View key={idx} style={tw`flex flex-row items-center space-x-4 justify-between`}>
            <Text style={tw`text-secondary text-xs`}>Fees paid to {item.label} LP</Text>
            <Text style={tw`text-secondary text-right text-xs`}>
              {feeAmount} {tokenMint?.symbol} ({formatNumber.format(new Decimal(item.lpFee.pct).mul(100).toNumber())}
              %)
            </Text>
          </View>
        );
      })}
    </>
  );
};
