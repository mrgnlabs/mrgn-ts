import React, { HTMLAttributes } from "react";
import { Pressable, View } from "react-native";

import tw from "~/styles/tailwind";

interface ISwapSettingButton {
  idx: number;
  itemsCount: number;
  className?: HTMLAttributes<HTMLButtonElement>["className"];
  onClick(): void;
  highlighted: boolean;
  roundBorder?: "left" | "right";
  children: React.ReactNode;
}

const SwapSettingButton = ({
  idx,
  itemsCount,
  className,
  onClick,
  highlighted,
  roundBorder,
  children,
}: ISwapSettingButton) => {
  return (
    <Pressable
      key={idx}
      style={tw`relative flex-1 text-secondary ${className ?? ""} ${highlighted ? "bg-[#303437]" : "bg-[#1B1B1E]"}`}
      onPress={onClick}
    >
      <View style={tw`h-full w-full leading-none flex justify-center items-center`}>{children}</View>
    </Pressable>
  );
};

export default SwapSettingButton;
