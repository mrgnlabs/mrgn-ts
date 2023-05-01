import { Button } from "@mui/material";
import { FC } from "react";
import LockIcon from "@mui/icons-material/Lock";
import Image from "next/image";

interface NavbarCenterItemProps {
  text: string;
  // icon?: any;
  textFormat?: string;
  disabled?: boolean;
  onClick?: () => void;
  link?: boolean;
  icon?: boolean;
}

const NavbarCenterItem: FC<NavbarCenterItemProps> = ({
  text,
  // icon,
  textFormat,
  disabled,
  onClick,
  link,
  icon,
}) => (
  <Button
    className={`px-6 h-full ${
      link ? "w-full min-w-full max-w-full" : "w-full min-w-full max-w-full"
    } text-sm flex justify-center gap-2 items-center font-light ${textFormat || "normal-case"}`}
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
    {icon && (
      <Image
        src="https://s2.coinmarketcap.com/static/img/coins/64x64/23095.png"
        alt="bonk"
        height={24}
        width={24}
        style={{ borderRadius: 100 }}
      />
    )}
    {disabled ? <LockIcon className="h-[14px] w-[14px]" /> : <></>}
  </Button>
);

export { NavbarCenterItem };
