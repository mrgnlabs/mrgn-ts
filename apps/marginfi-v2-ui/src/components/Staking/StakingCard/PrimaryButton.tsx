import React, { FC, ReactNode } from "react";
import { Button, ButtonProps } from "@mui/material";

// Put this in common folder in the future when all is merged

interface PrimaryButtonProps extends ButtonProps {
  children?: ReactNode;
  bgColor?: string;
}

export const PrimaryButton: FC<PrimaryButtonProps> = ({ children, disabled, bgColor, ...otherProps }) => (
  <Button
    style={{
      width: "100%",
      textTransform: "capitalize",
      backgroundColor: disabled ? "gray" : bgColor ? bgColor : "rgb(227, 227, 227)",
      border: disabled ? "gray" : bgColor ? "solid 1px rgb(227, 227, 227)" : "solid 1px transparent",
      color: bgColor === "rgba(0,0,0,0)" && !disabled ? "rgb(227, 227, 227)" : "black",
      fontWeight: 400,
      fontFamily: "Aeonik Pro",
      zIndex: 10,
    }}
    {...otherProps}
    disabled={disabled}
  >
    {children}
  </Button>
);
