import React from "react";
import { TransactionFeeInfo } from "@jup-ag/react-hook";
import { View, Text } from "react-native";
import tw from "~/styles/tailwind";
import { formatNumber, fromLamports } from "~/utils";

interface props {
  hasSerumDeposit: boolean;
  hasAtaDeposit: boolean;
  feeInformation: TransactionFeeInfo | undefined;
}

export const Deposits = ({ hasSerumDeposit, hasAtaDeposit, feeInformation }: props) => {
  if (hasSerumDeposit || hasAtaDeposit) {
    return (
      <View style={tw`flex flex-row items-start justify-between`}>
        <Text style={tw`flex flex-row w-[50%] text-secondary text-xs`}>Deposit</Text>
        <View style={tw`w-[50%] text-right`}>
          {(() => {
            const content = [
              hasAtaDeposit && (
                <View key="ata">
                  <Text style={tw`text-secondary text-xs text-right`}>
                    {formatNumber.format(
                      fromLamports(
                        feeInformation?.ataDeposits.reduce((s, deposit) => {
                          s += deposit;
                          return s;
                        }, 0),
                        9
                      )
                    )}{" "}
                    SOL for {feeInformation?.ataDeposits?.length}{" "}
                    {(feeInformation?.ataDeposits?.length || 0) > 0 ? "ATA account" : "ATA accounts"}
                  </Text>
                </View>
              ),
              hasSerumDeposit && (
                <View key="serum">
                  <Text style={tw`text-secondary text-xs text-right`}>
                    {formatNumber.format(
                      fromLamports(
                        feeInformation?.openOrdersDeposits.reduce((s, deposit) => {
                          s += deposit;
                          return s;
                        }, 0),
                        9
                      )
                    )}{" "}
                    SOL for {feeInformation?.openOrdersDeposits.length}{" "}
                    {(feeInformation?.openOrdersDeposits?.length || 0) > 0
                      ? "Serum OpenOrders account"
                      : "Serum OpenOrders accounts"}
                  </Text>
                </View>
              ),
            ].filter(Boolean);

            if (content.length) {
              return content;
            }

            return "-";
          })()}
        </View>
      </View>
    );
  }

  return null;
};
