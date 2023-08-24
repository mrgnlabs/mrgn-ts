import React from "react";
import { View, StyleSheet, Animated } from "react-native";
import { TapGestureHandler } from "react-native-gesture-handler";

type props = {
  isEnabled: boolean;
  toggleSwitch: () => void;
};

export const Toggle = ({ isEnabled, toggleSwitch }: props) => {
  const thumbSize = 22; // Set the desired thumb size here

  const offsetX = new Animated.Value(isEnabled ? thumbSize - 1.8 : 1.8);

  return (
    <TapGestureHandler onHandlerStateChange={toggleSwitch}>
      <Animated.View style={[styles.switchContainer, { width: thumbSize * 2 }]}>
        <View style={[styles.track, { backgroundColor: isEnabled ? "#FFFFFF" : "#27272A" }]} />
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              backgroundColor: "#09090B",
              transform: [{ translateX: offsetX }],
            },
          ]}
        />
      </Animated.View>
    </TapGestureHandler>
  );
};

const styles = StyleSheet.create({
  switchContainer: {
    flexDirection: "row",
    borderRadius: 15,
    overflow: "hidden",
  },
  track: {
    flex: 1,
    height: 24,
  },
  thumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    marginVertical: "auto",
    borderRadius: 20,
  },
});
