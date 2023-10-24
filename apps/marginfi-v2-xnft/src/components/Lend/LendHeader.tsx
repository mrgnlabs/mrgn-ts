import React from "react";
import { View, Text } from "react-native";

import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { usdFormatterDyn, usdFormatter } from "@mrgnlabs/mrgn-common";

import tw from "~/styles/tailwind";
import { Separator } from "~/components/Common";

type Props = {
  accountSummary?: AccountSummary;
};

export function LendHeader({ accountSummary }: Props) {
  return (
    <View
      style={tw`flex flex-row max-w-screen-sm justify-between mb-16px py-20px px-12px border-t border-b border-border`}
    >
      <View style={tw`flex flex-col`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>Supplied</Text>
        <Text style={tw`font-medium text-xl text-primary`}>
          {accountSummary &&
            (Math.round(accountSummary.lendingAmountUnbiased) > 10000
              ? usdFormatterDyn.format(Math.round(accountSummary.lendingAmountUnbiased))
              : usdFormatter.format(accountSummary.lendingAmountUnbiased))}
        </Text>
      </View>
      <Separator />
      <View style={tw`flex flex-col`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>Borrowed</Text>
        <Text style={tw`font-medium text-xl text-primary`}>
          {accountSummary &&
            (Math.round(accountSummary.borrowingAmountUnbiased) > 10000
              ? usdFormatterDyn.format(Math.round(accountSummary.borrowingAmountUnbiased))
              : usdFormatter.format(accountSummary.borrowingAmountUnbiased))}
        </Text>
      </View>
      <Separator />
      <View style={tw`flex flex-col`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>Free collateral</Text>
        <Text style={tw`font-medium text-xl text-primary`}>
          {accountSummary && usdFormatter.format(accountSummary.signedFreeCollateral)}
        </Text>
      </View>
    </View>
  );
}
