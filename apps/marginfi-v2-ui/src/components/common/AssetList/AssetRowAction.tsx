import { FC, ReactNode } from "react";
import { Button, ButtonProps } from "@mui/material";
import { cn } from "~/utils";

interface AssetRowActionProps extends ButtonProps {
  children?: ReactNode;
  bgColor?: string;
}

const AssetRowAction: FC<AssetRowActionProps> = ({ children, disabled, bgColor, className, ...otherProps }) => (
  <Button
    className={cn(className, "normal-case text-normal sm:text-sm px-4 sm:mx-0 sm:w-32 h-11 max-w-14 rounded-md")}
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
