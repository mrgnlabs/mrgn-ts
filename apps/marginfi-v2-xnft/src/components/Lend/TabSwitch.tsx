import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRecoilState } from "recoil";
import tw from "~/styles/tailwind";
import { tabActiveAtom } from "~/consts";

type Props = {};

export function TabSwitch({}: Props) {
  const [tabActive, setTabActive] = useRecoilState(tabActiveAtom);

  const handleLendClick = () => {
    setTabActive("lend");
  };

  const handleBorrowClick = () => {
    setTabActive("borrow");
  };

  const styles = {
    selectedStyle: tw`text-primary bg-[#131618]`,
    unSelectedStyle: tw`text-secondary`,
    commonStyle: tw`px-12px py-6px rounded`,
  };

  return (
    <View
      style={tw`flex flex-row justify-between bg-[#22282C] p-1.25 w-129px h-38px rounded-md`}>
      <TouchableOpacity
        style={[
          styles.commonStyle,
          tabActive === "lend" ? styles.selectedStyle : styles.unSelectedStyle,
        ]}
        onPress={handleLendClick}>
        <Text style={tw`text-inherit leading-14px my-auto`}>Lend</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.commonStyle,
          tabActive === "borrow"
            ? styles.selectedStyle
            : styles.unSelectedStyle,
        ]}
        onPress={handleBorrowClick}>
        <Text style={tw`text-inherit leading-14px my-auto`}>Borrow</Text>
      </TouchableOpacity>
    </View>
  );
}
