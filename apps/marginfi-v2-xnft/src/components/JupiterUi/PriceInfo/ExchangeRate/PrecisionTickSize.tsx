import React from "react";
import Decimal from "decimal.js";
import tw from "~/styles/tailwind";
import { Text, View } from "react-native";

function generateSubscriptNumbers(x: number): string {
  const subscriptNumbers: string[] = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
  const xString: string = x.toString();
  let result: string = "";

  for (let i = 0; i < xString.length; i++) {
    const digit: number = parseInt(xString.charAt(i), 10);
    const subscriptNumber: string = subscriptNumbers[digit];
    result += subscriptNumber;
  }

  return result;
}

const usePrecisionTick = (value: number): [number, string, string] => {
  const firstSD = Decimal.abs(Decimal.ceil(new Decimal(-1).mul(Decimal.log10(value)))).toNumber();
  const [prefix, suffix] = [
    new Decimal(value).toFixed().slice(0, firstSD + 2), // +2 to account for 0.
    new Decimal(value).toFixed().slice(firstSD + 1), // +1 to account for 0. - and slice index
  ];

  return [firstSD, prefix, suffix];
};

export const PrecisionTickSize: React.FC<{
  value: number;
  maxSuffix?: number;
}> = ({ value, maxSuffix }) => {
  const [firstSD, _, suffix] = usePrecisionTick(value);

  if (firstSD <= 5) {
    return <Text style={tw`text-secondary text-sm`}>{value.toFixed(6)}</Text>;
  }

  return (
    <View style={tw`flex flex-row items-center h-4`}>
      <Text style={tw`text-secondary text-sm`}>0.0</Text>
      <Text style={tw`text-secondary mb-3 text-xl mx-0.5`}>{generateSubscriptNumbers(firstSD - 1)}</Text>
      <Text style={tw`text-secondary text-sm`}>{suffix.slice(0, maxSuffix)}</Text>
    </View>
  );
};
