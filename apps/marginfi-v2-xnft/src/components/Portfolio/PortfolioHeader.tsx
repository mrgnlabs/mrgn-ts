import React from "react";
import { View, Text } from "react-native";
import ContentLoader, { Rect } from "react-content-loader/native";

import { numeralFormatter } from "@mrgnlabs/mrgn-common";

import tw from "~/styles/tailwind";
import { Separator } from "~/components/Common";

type Props = {
  globalDeposits: number;
  globalBorrowed: number;
  tvl: number;
};

export function PortfolioHeader({ globalDeposits, globalBorrowed, tvl }: Props) {
  return (
    <View style={tw`flex flex-row max-w-screen-sm justify-between mb-16px py-20px px-12px `}>
      <View style={tw`flex flex-col`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>Supplied</Text>
        <Text style={tw`font-medium text-xl text-primary`}>
          {globalDeposits ? <>${numeralFormatter(globalDeposits)}</> : <PortfolioValueSkeleton />}
        </Text>
      </View>
      <Separator />
      <View style={tw`flex flex-col`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>Borrowed</Text>
        <Text style={tw`font-medium text-xl text-primary`}>
          {globalBorrowed ? <>${numeralFormatter(globalBorrowed)}</> : <PortfolioValueSkeleton />}
        </Text>
      </View>
      <Separator />
      <View style={tw`flex flex-col`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>TVL</Text>
        <Text style={tw`font-medium text-xl text-primary`}>
          {tvl ? <>${numeralFormatter(tvl)}</> : <PortfolioValueSkeleton />}
        </Text>
      </View>
    </View>
  );
}

const PortfolioValueSkeleton = () => {
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
