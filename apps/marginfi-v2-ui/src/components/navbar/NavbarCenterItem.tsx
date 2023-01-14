import { Button } from "@mui/material";
import { FC } from "react";
import LockIcon from "@mui/icons-material/Lock";

interface NavbarCenterItemProps {
  text: string;
  // icon?: any;
  textFormat?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const NavbarCenterItem: FC<NavbarCenterItemProps> = ({
  text,
  // icon,
  textFormat,
  disabled,
  onClick,
}) => (
  <Button
    className={`h-full w-1/4 max-w-1/4 text-xs flex justify-center items-center ${
      textFormat || "normal-case"
    }`}
    variant="text"
    disabled={disabled}
    style={{
      color: disabled ? "rgba(255, 255, 255, 0.2)" : "#fff",
      // @todo clean UI change on click
      backgroundColor: "transparent",
      fontFamily: "Aeonik Pro Light",
    }}
    onClick={onClick}
  >
    {text}
    {disabled ? <LockIcon className="h-[14px] w-[14px] ml-2" /> : <></>}
  </Button>
);

export { NavbarCenterItem };
