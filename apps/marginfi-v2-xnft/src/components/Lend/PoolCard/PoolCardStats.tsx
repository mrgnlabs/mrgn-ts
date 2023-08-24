import React, { useMemo } from "react";
import { View, Text } from "react-native";
import tw from "~/styles/tailwind";

import * as utils from "~/utils";
import { Separator } from "~/components/Common";
import { WSOL_MINT } from "~/config";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";

type Props = {
  bankInfo: ExtendedBankInfo;
  nativeSolBalance: number;
  isInLendingMode: boolean;
  bankFilled: number;
};

export function PoolCardStats({
  bankInfo,
  isInLendingMode,
  nativeSolBalance,
  bankFilled,
}: Props) {
  const assetWeight = useMemo(() => {
    if (bankInfo.bank.config.assetWeightMaint.toNumber() <= 0) {
      return "-";
    }
    return isInLendingMode
      ? (bankInfo.bank.config.assetWeightMaint.toNumber() * 100).toFixed(0) +
          "%"
      : (
          (1 / bankInfo.bank.config.liabilityWeightInit.toNumber()) *
          100
        ).toFixed(0) + "%";
  }, [isInLendingMode, bankInfo]);

  const bankAmount = useMemo(
    () =>
      numeralFormatter(
        isInLendingMode
          ? bankInfo.totalPoolDeposits
          : Math.min(
              bankInfo.totalPoolDeposits,
              bankInfo.bank.config.borrowLimit,
            ) - bankInfo.totalPoolBorrows,
      ),
    [isInLendingMode, bankInfo],
  );

  const userBalance = useMemo(
    () =>
      numeralFormatter(
        bankInfo.tokenMint.equals(WSOL_MINT)
          ? bankInfo.tokenAccount.balance + nativeSolBalance
          : bankInfo.tokenAccount.balance,
      ),
    [bankInfo, nativeSolBalance],
  );

  const isFilled = useMemo(() => bankFilled >= 0.9999, [bankFilled]);

  const isHigh = useMemo(() => bankFilled >= 0.9, [bankFilled]);

  return (
    <View style={tw`flex flex-row`}>
      <View style={tw`flex flex-col min-w-77px`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>Weight</Text>
        <Text style={tw`font-medium text-base text-primary`}>
          {assetWeight}
        </Text>
      </View>
      <Separator style={tw`mx-12px`} />
      <View style={tw`flex flex-col min-w-77px`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>
          {isInLendingMode ? "Deposits" : "Available"}
        </Text>
        <Text style={tw`font-medium text-base text-primary`}>{bankAmount}</Text>
        {isHigh && (
          <Text style={tw`text-${isFilled ? "error" : "warning"}`}>
            {percentFormatter.format(bankFilled)}
          </Text>
        )}
      </View>
      <Separator style={tw`mx-12px`} />
      <View style={tw`flex flex-col min-w-77px`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>Your Balance</Text>
        <Text style={tw`font-medium text-base text-primary`}>
          {userBalance + " " + bankInfo.tokenSymbol}
        </Text>
      </View>
    </View>
  );
}
