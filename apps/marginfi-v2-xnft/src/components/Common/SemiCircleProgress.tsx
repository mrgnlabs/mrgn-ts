import React, { useEffect, useRef, useState } from "react";
import { Animated, View, StyleSheet, Text } from "react-native";

import { percentFormatter } from "@mrgnlabs/mrgn-common";

import tw from "~/styles/tailwind";

const progressShadowColor = "#3D3D3D";
const interiorCircleColor = "#1C2023";
const circleRadius = 100;
const interiorCircleRadius = 90;
const progressWidth = 10;
const animationSpeed = 2;

type Props = {
  amount: number;
};

export const SemiCircleProgress = ({ amount }: Props) => {
  const rotationAnimation = useRef(new Animated.Value(0)).current;
  const [progressColor, setProgressColor] = useState<string>("#75BA80");

  useEffect(() => {
    if (amount) {
      let color;

      if (amount >= 50) {
        color = "#75ba80"; // green color
      } else if (amount >= 25) {
        color = "#FABD12"; // yellow color
      } else {
        color = "#E06D6F"; // red color
      }

      setProgressColor(color);
    }
  }, [amount]);

  useEffect(() => {
    if (amount) {
      Animated.spring(rotationAnimation, {
        toValue: amount,
        speed: animationSpeed,
        useNativeDriver: true,
      }).start();
    }
  }, [rotationAnimation, amount]);

  const styles = StyleSheet.create({
    exteriorCircle: {
      width: circleRadius * 2,
      height: circleRadius,
      borderRadius: circleRadius,
      backgroundColor: progressShadowColor,
    },
    rotatingCircleWrap: {
      width: circleRadius * 2,
      height: circleRadius,
      top: circleRadius,
    },
    rotatingCircle: {
      width: circleRadius * 2,
      height: circleRadius,
      borderRadius: circleRadius,
      backgroundColor: progressColor,
    },
    interiorCircle: {
      width: interiorCircleRadius * 2,
      height: interiorCircleRadius,
      borderRadius: interiorCircleRadius,
      backgroundColor: interiorCircleColor,
      top: progressWidth,
    },
  });

  return (
    <View style={[defaultStyles.exteriorCircle, styles.exteriorCircle]}>
      <View style={[defaultStyles.rotatingCircleWrap, styles.rotatingCircleWrap]}>
        <Animated.View
          style={[
            defaultStyles.rotatingCircle,
            styles.rotatingCircle,
            {
              transform: [
                { translateY: -circleRadius / 2 },
                {
                  rotate: rotationAnimation.interpolate({
                    inputRange: [0, 100], // or the range of values you're using
                    outputRange: ["0deg", "180deg"], // or the corresponding rotation values
                  }),
                },
                { translateY: circleRadius / 2 },
              ],
            },
          ]}
        />
      </View>
      <View style={[defaultStyles.interiorCircle, styles.interiorCircle]}>
        <Text style={[{ color: progressColor }, tw`text-26px font-semibold`]}>
          {percentFormatter.format(amount / 100)}
        </Text>
      </View>
    </View>
  );
};

const defaultStyles = StyleSheet.create({
  exteriorCircle: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    alignItems: "center",
    overflow: "hidden",
  },
  rotatingCircleWrap: {
    position: "absolute",
    left: 0,
  },
  rotatingCircle: {
    position: "absolute",
    top: 0,
    left: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  interiorCircle: {
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "center",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
