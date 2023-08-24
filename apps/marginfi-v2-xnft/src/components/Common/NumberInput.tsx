import React, { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import tw from "~/styles/tailwind";
import { countDecimalPlaces } from "~/utils";

interface NumberInputProps {
  min: number;
  max: number;
  amount: string;
  decimals: number;
  onValueChange: (value: string) => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  min,
  max,
  amount,
  decimals,
  onValueChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = (text: string) => {
    const parsedValue = Number.parseFloat(text); // Convert input value to a Float
    const numericValue = Number(text);

    if (Number.isNaN(parsedValue)) {
      onValueChange(min.toString()); // In case user input a characters instead of a number
    } else if (parsedValue >= max) {
      onValueChange(max.toString()); // Set the value to 11.99 if the user input more than 11.99
    } else if (parsedValue < min) {
      onValueChange(min.toString()); // Set the value to 0 if the user input is below 0. You can customize this part if you want a minimum value
    } else if (text.includes(".") && !Number.isNaN(numericValue)) {
      if (countDecimalPlaces(parsedValue) > decimals) {
        onValueChange(parsedValue.toFixed(decimals));
      } else {
        onValueChange(text.toString());
      }
    } else {
      onValueChange(parsedValue.toString());
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <View>
      <TextInput
        style={[
          styles.input,
          tw`border border-solid border-border`,
          { outlineStyle: "none" } as any,
          isFocused ? styles.focusedInput : null,
        ]}
        keyboardType="numeric"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChangeText={handleChangeText}
        value={amount}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    width: "100%",
    fontSize: 14,
    lineHeight: 14,
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0,
    color: "white",
    opacity: 0.6, // Default opacity
    borderRadius: 6,
  },
  focusedInput: {
    opacity: 1, // Opacity when focused
  },
});
