import React from "react";
import { QuoteResponse, SwapMode } from "@jup-ag/react-hook";

import Decimal from "decimal.js";
import { formatNumber } from "~/utils";
import { View, Text } from "react-native";
import tw from "~/styles/tailwind";
import { useJupiterStore } from "~/store/store";

interface props {
  routePlan: QuoteResponse["routePlan"] | undefined;
  swapMode: SwapMode | undefined;
}

export const Fees = ({ routePlan, swapMode }: props) => {
  const [tokenMap] = useJupiterStore((state) => [state.tokenMap]);

  if (!routePlan || (routePlan && routePlan.length === 0)) {
    return null;
  }
  return (
    <>
      {routePlan.map((item, idx) => {
        const tokenMint = tokenMap.get(item.swapInfo.feeMint.toString());
        const decimals = tokenMint?.decimals ?? 6;

        const feeAmount = formatNumber.format(
          new Decimal(item.swapInfo.feeAmount.toString()).div(Math.pow(10, decimals)).toNumber()
        );
        const feePct = new Decimal(item.swapInfo.feeAmount.toString())
          .div(
            new Decimal(
              item.swapInfo.inputMint.toString() === item.swapInfo.feeMint.toString()
                ? item.swapInfo.inAmount.toString()
                : item.swapInfo.outAmount.toString()
            )
          )
          .toDP(4);

        return (
          <View key={idx} style={tw`flex flex-row items-center space-x-4 justify-between`}>
            <Text style={tw`text-secondary text-xs`}>Fees paid to {item.swapInfo.label} LP</Text>
            <Text style={tw`text-secondary text-right text-xs`}>
              {feeAmount} {tokenMint?.symbol} ({formatNumber.format(new Decimal(feePct).mul(100).toNumber())}
              %)
            </Text>
          </View>
        );
      })}
    </>
  );
};
