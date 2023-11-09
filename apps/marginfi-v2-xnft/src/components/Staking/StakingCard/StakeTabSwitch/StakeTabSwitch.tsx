import React, { Dispatch, SetStateAction } from "react";
import { View, Text, Pressable } from "react-native";
import tw from "~/styles/tailwind";

type Props = {
  isChecked: boolean;
  setChecked: Dispatch<SetStateAction<boolean>>;
};

export function StakeTabSwitch({ isChecked, setChecked }: Props) {
  const styles = {
    selectedStyle: tw`text-primary bg-[#131618]`,
    unSelectedStyle: tw`text-secondary`,
    commonStyle: tw`px-12px py-6px rounded flex-1 `,
  };

  return (
    <View style={tw`flex flex-row justify-between bg-[#22282C] p-1.25 w-full h-42px rounded-md`}>
      <Pressable
        style={[styles.commonStyle, isChecked ? styles.selectedStyle : styles.unSelectedStyle]}
        onPress={() => setChecked(false)}
      >
        <Text style={tw`text-inherit font-medium text-base leading-14px my-auto text-center`}>Tokens</Text>
      </Pressable>
      <Pressable
        style={[styles.commonStyle, !isChecked ? styles.selectedStyle : styles.unSelectedStyle]}
        onPress={() => setChecked(true)}
      >
        <Text style={tw`text-inherit font-medium text-base leading-14px my-auto text-center`}>Native Stake</Text>
      </Pressable>
    </View>
  );
}
