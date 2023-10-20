import React from "react";
import { View, Text } from "react-native";
import ContentLoader, { Rect } from "react-content-loader/native";
import { numeralFormatter, percentFormatterDyn } from "@mrgnlabs/mrgn-common";

import { Separator } from "~/components/Common";
import tw from "~/styles/tailwind";

type Props = {
  isLoading: boolean;
  solUsdValue?: number;
  tvl?: number;
  projectedApy?: number;
};

export function StakingStats({ isLoading, solUsdValue = 0, tvl = 0, projectedApy = 0 }: Props) {
  return (
    <View style={tw`rounded-xl font-[500]`}>
      <View
        style={tw`flex flex-column sm:flex-row justify-center gap-0 sm:gap-8 w-full min-w-1/2 mt-[20px] bg-[#1C2023] sm:bg-transparent rounded-xl`}
      >
        <View style={tw`flex flex-row sm:flex-column justify-between p-3 sm:p-0 gap-1`}>
          <Text style={tw`font-aeonik font-[400] text-base flex gap-1 my-auto text-secondary`}>TVL</Text>
          <Text style={tw`font-aeonik font-[500] text-xl text-primary`}>
            {isLoading && solUsdValue !== 0 ? `$${numeralFormatter(tvl * solUsdValue)}` : <StakeValueSkeleton />}
          </Text>
        </View>
        <View style={tw`flex flex-row sm:flex-column justify-between p-3 sm:p-0 gap-1`}>
          <Text style={tw`font-aeonik font-[400] text-base flex gap-1 my-auto text-secondary`}>Projected APY</Text>
          <Text style={tw`font-aeonik font-[500] text-xl text-primary`}>
            {isLoading ? percentFormatterDyn.format(projectedApy) : <StakeValueSkeleton />}
          </Text>
        </View>
      </View>
    </View>
  );
}

const StakeValueSkeleton = () => {
  return (
    <ContentLoader
      speed={2}
      width={60}
      height={28}
      viewBox="0 0 60 28"
      backgroundColor="#272727"
      foregroundColor="#ecebeb"
    >
      <Rect x="2" y="2" rx="3" ry="3" width="58" height="26" />
    </ContentLoader>
  );
};
