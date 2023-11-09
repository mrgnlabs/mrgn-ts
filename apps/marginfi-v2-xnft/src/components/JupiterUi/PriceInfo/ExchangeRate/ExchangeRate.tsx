import { TokenInfo } from "@solana/spl-token-registry";

import Decimal from "decimal.js";
import JSBI from "jsbi";
import * as React from "react";
import { fromLamports } from "~/utils";
import * as icons from "~/assets/icons";
import { Pressable, View } from "react-native";
import tw from "~/styles/tailwind";
import { ExchangeRateLine } from "./ExchangeRateLine";

interface IRateParams {
  inAmount: JSBI;
  inputDecimal: number;
  outAmount: JSBI;
  outputDecimal: number;
}

const calculateRate = (
  { inAmount, inputDecimal, outAmount, outputDecimal }: IRateParams,
  reverse: boolean
): Decimal => {
  const input = fromLamports(inAmount, inputDecimal);
  const output = fromLamports(outAmount, outputDecimal);

  const rate = !reverse ? new Decimal(input).div(output) : new Decimal(output).div(input);

  if (Number.isNaN(rate.toNumber())) {
    return new Decimal(0);
  }

  return rate;
};

interface ExchangeRateProps {
  loading?: boolean;
  fromTokenInfo: TokenInfo;
  rateParams: IRateParams;
  toTokenInfo: TokenInfo;
  reversible?: boolean;
}

export const ExchangeRate = ({
  loading = false,
  fromTokenInfo,
  rateParams,
  toTokenInfo,
  reversible = true,
}: ExchangeRateProps) => {
  const [reverse, setReverse] = React.useState(reversible ?? true);

  const rate = React.useMemo(() => calculateRate(rateParams, reverse), [loading, reverse, rateParams]);

  const onReverse = React.useCallback(() => {
    setReverse((prevState) => !prevState);
  }, []);

  return (
    <Pressable style={tw`flex flex-row cursor-pointer`} onPress={() => onReverse()}>
      <View style={tw`max-w-full flex flex-row whitespace-nowrap`}>
        {reverse ? (
          <ExchangeRateLine fromTokenInfo={fromTokenInfo} toTokenInfo={toTokenInfo} rate={rate} />
        ) : (
          <ExchangeRateLine fromTokenInfo={toTokenInfo} toTokenInfo={fromTokenInfo} rate={rate} />
        )}
      </View>
      {reversible ? (
        <View style={tw`ml-2`}>
          <icons.ApproxIcon />
        </View>
      ) : null}
    </Pressable>
  );
};
