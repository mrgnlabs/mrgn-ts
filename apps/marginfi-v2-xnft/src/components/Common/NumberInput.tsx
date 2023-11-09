import React, { useEffect, useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Style } from "twrnc/dist/esm/types";

import tw from "~/styles/tailwind";
import * as utils from "~/utils";

interface NumberInputProps {
  min: number;
  max?: number;
  amount: string;
  decimals: number;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  hasBorder?: boolean;
  placeholder?: string;
  textAlign?: "center" | "right" | "left";
  wrapperStyle?: Style;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  min,
  max = Number.MAX_SAFE_INTEGER,
  amount,
  decimals,
  onValueChange,
  disabled = false,
  hasBorder = true,
  placeholder = "",
  textAlign = undefined,
  wrapperStyle,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localAmount, setLocalAmount] = useState(amount);
  const [isZeroDecimal, setIsZeroDecimal] = useState<boolean>(false);

  useEffect(() => {
    if (!isZeroDecimal) {
      setLocalAmount(amount);
    }
  }, [amount, isZeroDecimal]);

  const handleChangeText = (text: string) => {
    const parsedValue = Number.parseFloat(text); // Convert input value to a Float
    const numericValue = Number(text);
    setIsZeroDecimal(false);

    if (Number.isNaN(parsedValue)) {
      onValueChange(min.toString()); // In case user input a characters instead of a number
    } else if (parsedValue >= max) {
      onValueChange(max.toString()); // Set the value to 11.99 if the user input more than 11.99
    } else if (parsedValue < min) {
      onValueChange(min.toString()); // Set the value to 0 if the user input is below 0. You can customize this part if you want a minimum value
    } else if (text.includes(".") && !Number.isNaN(numericValue)) {
      if (utils.countDecimalPlaces(parsedValue) === 0) {
        setIsZeroDecimal(true);
        setLocalAmount(text);
        onValueChange(parsedValue.toFixed(decimals));
      } else if (utils.countDecimalPlaces(parsedValue) > decimals) {
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
    <View style={wrapperStyle}>
      <TextInput
        style={[
          styles.input,
          hasBorder && tw`border border-solid border-border`,
          { outlineStyle: "none" } as any,
          isFocused ? styles.focusedInput : null,
          textAlign && { textAlign: textAlign },
        ]}
        placeholder={placeholder}
        keyboardType="numeric"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChangeText={handleChangeText}
        value={localAmount}
        editable={!disabled}
        selectTextOnFocus={!disabled}
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
