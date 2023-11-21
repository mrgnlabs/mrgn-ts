import React, { useState, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { useOnClickOutside } from "usehooks-ts";

import { KeyArrowDownIcon } from "~/assets/icons";
import { KeyArrowUpIcon } from "~/assets/icons";
import tw from "~/styles/tailwind";
import { SORT_OPTIONS_MAP, SortAssetOption } from "~/utils";

type props = {
  selectedItem: SortAssetOption;
  setSelectedItem: React.Dispatch<React.SetStateAction<SortAssetOption>>;
};

export const Select = ({ selectedItem, setSelectedItem }: props) => {
  const selectRef = useRef(null);

  useOnClickOutside(selectRef, () => setIsExpanded(false));
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleSelectOption = (value: SortAssetOption) => {
    setSelectedItem(value);
    setIsExpanded(false);
  };

  return (
    <View style={tw`relative`} ref={selectRef}>
      <Pressable
        style={[tw`relative bg-[#1C2125] w-[102px] h-[36px] rounded-md`]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={tw`flex flex-row gap-2 h-full items-center px-3 py-2`}>
          <Text style={tw`text-primary text-base`}>{selectedItem.label}</Text>
          <selectedItem.Icon height={20} width={20} />
          <View style={tw`absolute right-1`}>{isExpanded ? <KeyArrowUpIcon /> : <KeyArrowDownIcon />}</View>
        </View>
      </Pressable>
      {isExpanded && (
        <View style={tw`absolute top-[36px] bg-[#1C2125] w-[102px] rounded-md`}>
          {Object.values(SORT_OPTIONS_MAP).map((item) => (
            <Pressable
              key={item.value}
              style={tw`flex flex-row justify-center items-center gap-3 h-[45px] w-full rounded-md ${
                item.value === selectedItem.value ? "bg-[#1C2732]" : ""
              }`}
              onPress={() => handleSelectOption(item)}
            >
              <Text style={tw`text-primary text-base`}>{item.label}</Text>
              <item.Icon height={20} width={20} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};
