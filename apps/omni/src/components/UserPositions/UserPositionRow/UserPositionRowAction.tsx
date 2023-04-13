import { Button, ButtonProps } from "@mui/material";
import { FC, ReactNode } from "react";

interface UserPositionRowActionProps extends ButtonProps {
  children: ReactNode;
}

const UserPositionRowAction: FC<UserPositionRowActionProps> = ({ children, ...otherProps }) => {
  return (
    <Button
      className={`font-aeonik ${
        otherProps.disabled ? "bg-gray" : "bg-btn-light"
      } text-black normal-case text-sm sm:mx-0 w-28 sm:w-30 h-10 max-w-1 rounded-[100px]`}
      {...otherProps}
    >
      {children}
    </Button>
  );
};

export { UserPositionRowAction };
