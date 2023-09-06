import { TokenInfo } from "@solana/spl-token-registry";

import Decimal from "decimal.js";

import * as React from "react";
import { formatNumber } from "~/utils";
import { View, Text } from "react-native";
import tw from "~/styles/tailwind";
import { PrecisionTickSize } from "./PrecisionTickSize";

interface props {
  fromTokenInfo: TokenInfo;
  rate: Decimal;
  toTokenInfo: TokenInfo;
}

export const ExchangeRateLine = ({ fromTokenInfo, rate, toTokenInfo }: props) => {
  return (
    <>
      <Text style={tw`text-secondary text-xs`}>1 {fromTokenInfo.symbol} ≈</Text>
      <View style={tw`flex flex-row ml-0.5`}>
        {rate.gt(0.000_01) ? (
          <Text style={tw`text-secondary text-xs`}>
            {formatNumber.format(rate.toNumber())} {toTokenInfo.symbol}
          </Text>
        ) : (
          <>
            <PrecisionTickSize value={rate.toNumber()} maxSuffix={6} />{" "}
            <Text style={tw`text-secondary text-xs`}>{toTokenInfo.symbol}</Text>
          </>
        )}
      </View>
    </>
  );
};
