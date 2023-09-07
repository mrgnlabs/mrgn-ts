import { Button, ButtonProps } from "@mui/material";
import { FC, ReactNode } from "react";

interface UserPositionRowActionProps extends ButtonProps {
  children: ReactNode;
}

const UserPositionRowAction: FC<UserPositionRowActionProps> = ({ children, disabled, ...otherProps }) => {
  return (
    <Button
      className="text-black normal-case text-[10px] sm:text-sm mx-2 sm:mx-0 w-14 sm:w-32 h-11 rounded-md max-w-[115px]"
      style={{
        backgroundColor: disabled ? "gray" : "rgb(227, 227, 227)",
        color: disabled ? "rgb(227, 227, 227)" : "black",
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
};

export { UserPositionRowAction };
