import { Button } from "@mui/material";
import { FC } from "react";
import LockIcon from "@mui/icons-material/Lock";

interface NavbarCenterItemProps {
  text: string;
  // icon?: any;
  textFormat?: string;
  disabled?: boolean;
  onClick?: () => void;
  link?: boolean;
}

const NavbarCenterItem: FC<NavbarCenterItemProps> = ({
  text,
  // icon,
  textFormat,
  disabled,
  onClick,
  link,
}) => (
  <Button
    className={`px-6 h-full ${
      link ? "w-full min-w-full max-w-full" : "w-1/4 min-w-1/4 max-w-1/4"
    } text-sm flex justify-evenly items-center font-light ${textFormat || "normal-case"}`}
    variant="text"
    disabled={disabled}
    style={{
      color: disabled ? "rgba(255, 255, 255, 0.2)" : "#000",
      // @todo clean UI change on click
      backgroundColor: "transparent",
      fontFamily: "Aeonik Pro",
    }}
    onClick={onClick}
  >
    {text}
    {disabled ? <LockIcon className="h-[14px] w-[14px]" /> : <></>}
  </Button>
);

export { NavbarCenterItem };
