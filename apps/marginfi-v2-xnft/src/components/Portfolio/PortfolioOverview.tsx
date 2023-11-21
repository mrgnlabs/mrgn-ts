import React, { useMemo } from "react";
import { View, Text } from "react-native";

import { MarginRequirementType, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, UserPointsData } from "@mrgnlabs/marginfi-v2-ui-state";
import { usdFormatterDyn, usdFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";

import tw from "~/styles/tailwind";
import { SemiCircleProgress } from "~/components/Common";

type Props = {
  selectedAccount?: MarginfiAccountWrapper;
  accountSummary?: AccountSummary;
  points: UserPointsData;
  isFirebaseConnected: boolean;
};

export function PortfolioOverview({ selectedAccount, accountSummary, points, isFirebaseConnected }: Props) {
  const healthFactor = useMemo(() => {
    if (selectedAccount) {
      const { assets, liabilities } = selectedAccount.computeHealthComponents(MarginRequirementType.Maintenance);
      return assets.isZero() ? 100 : assets.minus(liabilities).dividedBy(assets).toNumber() * 100;
    } else {
      return null;
    }
  }, [selectedAccount]);

  const labelStyle = tw`text-sm font-normal text-[#4E5257]`;
  const valueStyle = tw`text-xl font-bold text-[#FFF]`;

  return (
    <View style={tw`bg-[#1C2125] rounded-xl px-12px py-16px flex flex-column gap-10px `}>
      <Text style={tw`bg-[#1C2125] rounded-xl text-2xl font-bold text-primary`}>Your overview</Text>
      <View style={tw`text-center m-auto`}>
        <Text style={[labelStyle, tw`pb-4px text-center`]}>Health factor</Text>
        <SemiCircleProgress amount={healthFactor ?? 0} />
      </View>
      <View style={tw`flex flex-row pt-10px flex-wrap gap-10px`}>
        <View style={tw`flex flex-column grow gap-10px`}>
          <View>
            <Text style={[labelStyle, tw`pb-4px`]}>Supplied</Text>
            <Text style={[valueStyle]}>
              {accountSummary &&
                (Math.round(accountSummary.lendingAmountUnbiased) > 10000
                  ? usdFormatterDyn.format(Math.round(accountSummary.lendingAmountUnbiased))
                  : usdFormatter.format(accountSummary.lendingAmountUnbiased))}
            </Text>
          </View>
          <View>
            <Text style={[labelStyle, tw`pb-4px`]}>Borrowed</Text>
            <Text style={[valueStyle]}>
              {accountSummary &&
                (Math.round(accountSummary.borrowingAmountUnbiased) > 10000
                  ? usdFormatterDyn.format(Math.round(accountSummary.borrowingAmountUnbiased))
                  : usdFormatter.format(accountSummary.borrowingAmountUnbiased))}
            </Text>
          </View>
        </View>
        <View style={tw`flex flex-column grow gap-10px`}>
          <View>
            <Text style={[labelStyle, tw`pb-4px`]}>Free Collateral</Text>
            <Text style={[valueStyle]}>
              {accountSummary && usdFormatter.format(accountSummary.signedFreeCollateral)}
            </Text>
          </View>
          <View>
            <Text style={[labelStyle, tw`pb-4px`]}>Points</Text>
            <Text style={[valueStyle]}>
              {isFirebaseConnected ? `${groupedNumberFormatterDyn.format(Math.round(points.totalPoints))} points` : "-"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
