import React, { FC, useState } from "react";
import { View, Text, Pressable } from "react-native";

import tw from "~/styles/tailwind";
import { SupportedSlippagePercent } from "~/store/lstStore";
import { CloseIcon } from "~/assets/icons";
import { PrimaryButton } from "~/components/Common";

interface SettingsModalProps {
  handleClose: () => void;
  setSelectedSlippagePercent: (slippage: SupportedSlippagePercent) => void;
  selectedSlippagePercent: SupportedSlippagePercent;
}

const SLIPPAGE_PRESET: SupportedSlippagePercent[] = [0.1, 0.5, 1.0, 5.0];

export const SettingsModal: FC<SettingsModalProps> = ({
  handleClose,
  selectedSlippagePercent: selectedSlippage,
  setSelectedSlippagePercent: setSelectedSlippage,
}) => {
  const [localSlippage, setLocalSlippage] = useState<SupportedSlippagePercent>(selectedSlippage);

  const onSaveSettings = () => {
    setSelectedSlippage(localSlippage);
    handleClose();
  };

  return (
    <View style={tw`mx-auto rounded-xl bg-[#1C2023] w-full max-w-[600px] p-4`}>
      <View style={tw`flex flex-row justify-between mb-3`}>
        <Text style={tw`font-aeonik font-[700] text-2xl inline text-primary`}>Swap Settings</Text>
        <Pressable style={tw`cursor-pointer`} onPress={() => handleClose()}>
          <CloseIcon color="white" />
        </Pressable>
      </View>
      <Text style={tw`font-aeonik font-[400] text-lg text-primary`}>Slippage Settings</Text>
      <View style={tw`flex flex-row items-center mt-2.5 rounded-xl overflow-hidden text-sm mb-10`}>
        {SLIPPAGE_PRESET.map((slippage, idx) => {
          const displayText = Number(slippage) + "%";
          const isHighlighted = localSlippage === slippage;
          return (
            <Pressable
              key={idx}
              style={tw`relative cursor-pointer flex-1 text-secondary py-3 ${
                isHighlighted ? "bg-[#DCE85D88] hover:bg-[#DCE85D88]" : "bg-[#1B1B1E]"
              }`}
              onPress={() => {
                setLocalSlippage(slippage);
              }}
            >
              <View style={tw`h-full w-full leading-none flex justify-center items-center`}>
                <Text style={tw`text-primary mt-[2px]`}>{displayText}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={tw`h-[36px]`}>
        <PrimaryButton onPress={() => onSaveSettings()} title="Save" />
      </View>
    </View>
  );
};
