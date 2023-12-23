import React, { useMemo } from "react";
import { View, Text } from "react-native";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, percentFormatterDyn } from "@mrgnlabs/mrgn-common";

import tw from "~/styles/tailwind";
import { Separator } from "~/components/Common";
import { WSOL_MINT } from "~/config";

type Props = {
  bank: ExtendedBankInfo;
  nativeSolBalance: number;
  isInLendingMode: boolean;
  bankFilledPercentage: number;
};

export function PoolCardStats({ bank, isInLendingMode, nativeSolBalance, bankFilledPercentage }: Props) {
  const assetWeight = useMemo(() => {
    if (bank.info.rawBank.config.assetWeightInit.toNumber() <= 0) {
      return "-";
    }
    return isInLendingMode
      ? (bank.info.rawBank.config.assetWeightInit.toNumber() * 100).toFixed(0) + "%"
      : ((1 / bank.info.rawBank.config.liabilityWeightInit.toNumber()) * 100).toFixed(0) + "%";
  }, [isInLendingMode, bank]);

  const bankAmount = useMemo(
    () =>
      numeralFormatter(
        isInLendingMode
          ? bank.info.state.totalDeposits
          : Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit.toNumber()) -
              bank.info.state.totalBorrows
      ),
    [isInLendingMode, bank]
  );

  const userBalance = useMemo(
    () =>
      numeralFormatter(
        bank.info.state.mint.equals(WSOL_MINT)
          ? bank.userInfo.tokenAccount.balance + nativeSolBalance
          : bank.userInfo.tokenAccount.balance
      ),
    [bank, nativeSolBalance]
  );

  const isFilled = useMemo(() => bankFilledPercentage >= 0.9999, [bankFilledPercentage]);

  const isHigh = useMemo(() => bankFilledPercentage >= 0.9, [bankFilledPercentage]);

  return (
    <View style={tw`flex flex-row justify-between`}>
      <View style={tw`flex flex-col min-w-77px`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>{isInLendingMode ? "Weight" : "LTV"}</Text>
        <Text style={tw`font-medium text-base text-primary`}>{assetWeight}</Text>
      </View>
      <Separator style={tw`mx-12px`} />
      <View style={tw`flex flex-col min-w-77px`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>{isInLendingMode ? "Deposits" : "Available"}</Text>
        <Text style={tw`font-medium text-base text-primary`}>{bankAmount}</Text>
        {isHigh && (
          <Text style={tw`text-${isFilled ? "error" : "warning"} text-xs`}>
            {percentFormatterDyn.format(bankFilledPercentage) + " FILLED"}
          </Text>
        )}
      </View>
      <Separator style={tw`mx-12px`} />
      <View style={tw`flex flex-col min-w-77px`}>
        <Text style={tw`font-normal text-sm text-tertiary`}>Wallet Balance</Text>
        <Text style={tw`font-medium text-base text-primary`}>{userBalance + " " + bank.meta.tokenSymbol}</Text>
      </View>
    </View>
  );
}
