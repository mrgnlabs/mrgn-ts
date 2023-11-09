import React, { useRef } from "react";
import { Text, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";

import tw from "~/styles/tailwind";

type Props = {
  title: string;
  isDisabled?: boolean;
  customStyles?: StyleProp<ViewStyle>;
  onPress: () => void;
};

export function PrimaryButton({ onPress, title, customStyles, isDisabled = false }: Props) {
  const pressableRef = useRef<any>();
  return (
    <Pressable
      ref={pressableRef}
      style={[styles.button, isDisabled ? tw`opacity-50 cursor-none` : tw`cursor-pointer`, customStyles]}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    color: "#020815",
    backgroundColor: "#FFF",
    borderColor: "#434343",
    textAlign: "center",
    height: 40,
    borderRadius: 6,
  },

  text: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: "600",
    textAlign: "center",
    color: "inherit",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
});
