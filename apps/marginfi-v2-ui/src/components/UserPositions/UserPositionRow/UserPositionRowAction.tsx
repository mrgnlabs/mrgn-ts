import { Button, ButtonProps } from "@mui/material";
import { FC, ReactNode } from "react";

interface UserPositionRowActionProps extends ButtonProps {
  children: ReactNode;
}

const UserPositionRowAction: FC<UserPositionRowActionProps> = ({ children, ...otherProps }) => {
  return (
    <Button
      className="bg-white text-black normal-case text-sm mx-2 sm:mx-0 w-28 sm:w-32 h-11 rounded-md max-w-[115px]"
      style={{
        backgroundColor: otherProps.disabled ? "gray" : "rgb(227, 227, 227)",
        color: "black",
        fontWeight: 400,
        fontFamily: "Aeonik Pro",
        zIndex: 10,
      }}
    >
      {children}
    </Button>
  );
};

export { UserPositionRowAction };
