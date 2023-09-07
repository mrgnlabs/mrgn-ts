import { Button, ButtonProps } from "@mui/material";
import { FC, ReactNode } from "react";

interface AssetRowActionProps extends ButtonProps {
  children?: ReactNode;
  bgColor?: string;
}

const AssetRowAction: FC<AssetRowActionProps> = ({ children, disabled, bgColor, ...otherProps }) => (
  <Button
    className="normal-case text-[10px] sm:text-sm mx-2 sm:mx-0 w-14 sm:w-32 h-11 max-w-1 rounded-md"
    style={{
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

export { AssetRowAction };
