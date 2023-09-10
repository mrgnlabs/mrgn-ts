import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { TransactionFeeInfo } from "@jup-ag/react-hook";
import tw from "~/styles/tailwind";

import { formatNumber, fromLamports } from "~/utils";

interface props {
  feeInformation: TransactionFeeInfo | undefined;
}

export const TransactionFee = ({ feeInformation }: props) => {
  const feeText = useMemo(() => {
    if (feeInformation) {
      return formatNumber.format(fromLamports(feeInformation.signatureFee, 9));
    }
    return "-";
  }, [feeInformation]);

  return (
    <View style={tw`flex flex-row items-center justify-between`}>
      <Text style={tw`flex flex-row w-[50%] text-secondary text-xs`}>Transaction Fee</Text>
      <Text style={tw`text-secondary text-xs`}>{feeText} SOL</Text>
    </View>
  );
};
