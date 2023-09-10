import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";

type Props = {
  style?: StyleProp<ViewStyle>;
  children: JSX.Element | JSX.Element[] | null;
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflowX: "hidden",
  },
});

export function Screen({ style, children }: Props) {
  return <View style={[styles.screen, style]}>{children}</View>;
}
