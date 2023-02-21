import { Button } from "@mui/material";
import { FC } from "react";

interface NavbarCenterItemProps {
  text: string;
  textFormat?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const NavbarCenterItem: FC<NavbarCenterItemProps> = ({ text, textFormat, disabled, onClick }) => (
  <Button
    className={`h-full w-1/5 min-w-fit max-w-1/5 text-sm flex justify-center items-center font-light ${
      textFormat || "normal-case"
    }`}
    variant="text"
    disabled={disabled}
    style={{
      color: disabled ? "rgba(255, 255, 255, 0.2)" : "#fff",
      // @todo clean UI change on click
      backgroundColor: "transparent",
      fontFamily: "Aeonik Pro",
    }}
    onClick={onClick}
  >
    {text}
  </Button>
);

export { NavbarCenterItem };
