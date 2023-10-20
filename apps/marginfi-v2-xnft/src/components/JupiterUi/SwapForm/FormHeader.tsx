import React from "react";
import { View, Text, Pressable } from "react-native";

import { useSwapContext } from "~/context";
import tw from "~/styles/tailwind";
import * as icons from "~/assets/icons";
import { formatNumber } from "~/utils";

interface props {
  handleOpenSettingsModal: () => void;
}

export const FormHeader = ({ handleOpenSettingsModal }: props) => {
  const {
    jupiter: { refresh, slippage },
  } = useSwapContext();

  return (
    <View style={tw`flex flex-row justify-between mb-7px`}>
      <Pressable style={tw`flex flex-row gap-6px`}>
        <icons.JupiterLogo />
        <Text style={tw`text-primary my-auto`}>Jupiter</Text>
      </Pressable>
      <View style={tw`flex flex-row gap-6px items-center`}>
        <Pressable
          style={tw`p-2 h-7 w-7 flex flex-row items-center justify-center border rounded-full border-white/10 bg-black/10 text-secondary`}
          onPress={() => refresh()}
        >
          <icons.RefreshIcon />
        </Pressable>
        <Pressable
          style={tw`p-2 h-7 gap-4px flex flex-row items-center justify-center border rounded-2xl border-white/10 bg-black/10 text-secondary`}
          onPress={() => handleOpenSettingsModal()}
        >
          <icons.SettingsIcon />
          <Text style={tw`text-xs text-secondary mt-2px`}>
            {isNaN(slippage) ? "0" : formatNumber.format(slippage)}%
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
