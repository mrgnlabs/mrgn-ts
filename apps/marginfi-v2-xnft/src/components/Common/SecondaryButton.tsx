import React, { useRef } from "react";
import { Text, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";

type Props = {
  title: string;
  isDisabled?: boolean;
  customStyles?: StyleProp<ViewStyle>;
  onPress: () => void;
};

export function SecondaryButton({ onPress, title, customStyles, isDisabled = false }: Props) {
  const pressableRef = useRef<any>();

  return (
    <Pressable ref={pressableRef} style={[styles.button, customStyles]} onPress={onPress} disabled={isDisabled}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    color: "#FFF",
    border: "1px solid #E2E8F0",
    textAlign: "center",

    height: 40,

    cursor: "pointer",
    borderRadius: 6,
  },

  text: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: "600",
    color: "inherit",
    textAlign: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
});
