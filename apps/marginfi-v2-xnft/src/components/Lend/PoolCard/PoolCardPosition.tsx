import { ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { usdFormatter } from "@mrgnlabs/mrgn-common";
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import tw from "~/styles/tailwind";

type Props = {
  bankInfo: ExtendedBankInfo;
};

export function PoolCardPosition({ bankInfo }: Props) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  const styles = StyleSheet.create({
    svgContainerCollapsed: {
      transform: [{ rotate: "180deg" }],
    },
  });

  return (
    <View style={tw`flex bg-[#23272B] p-12px rounded-lg`}>
      <View style={tw`flex flex-row justify-between `}>
        <Text style={tw`text-primary my-auto`}>Your position details</Text>
        <Pressable onPress={() => setIsCollapsed(!isCollapsed)}>
          <View
            style={[tw`h-18px`, !isCollapsed && styles.svgContainerCollapsed]}>
            <svg
              width="24"
              height="12"
              viewBox="0 0 24 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6 9L12 15L18 9"
                stroke="#E0E0E0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </View>
        </Pressable>
      </View>
      {!isCollapsed && (
        <View style={tw`flex flex-column gap-8px pt-8px`}>
          <View style={tw`flex flex-row justify-between`}>
            <Text style={tw`text-secondary my-auto`}>
              {(bankInfo as ActiveBankInfo).position.isLending
                ? "Lending"
                : "Borrowing"}
            </Text>
            <Text style={tw`text-primary text-base my-auto`}>
              {(bankInfo as ActiveBankInfo).position.amount.toFixed(
                bankInfo.tokenMintDecimals,
              ) +
                " " +
                bankInfo.tokenSymbol}
            </Text>
          </View>
          <View style={tw`flex flex-row justify-between`}>
            <Text style={tw`text-secondary my-auto`}>USD value</Text>
            <Text style={tw`text-primary text-base my-auto`}>
              {" "}
              {usdFormatter.format(
                (bankInfo as ActiveBankInfo).position.usdValue,
              )}
            </Text>
          </View>
          {/* <View style={tw`flex flex-row justify-between`}>
            <Text style={tw`text-secondary`}>WTD</Text>
            <Text style={tw`text-primary text-base`}>$122.121.44</Text>
          </View> */}
        </View>
      )}
    </View>
  );
}
