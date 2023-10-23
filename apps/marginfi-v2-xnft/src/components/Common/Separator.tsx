import React from "react";
import { View } from "react-native";
import { Style } from "twrnc/dist/esm/types";
import tw from "~/styles/tailwind";

type Props = {
  style?: Style;
};

export function Separator({ style }: Props) {
  return <View style={[tw`border-l border-border h-[44px]`, style]}></View>;
}
