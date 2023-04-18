import { FC } from "react";
// import Link from "next/link";
// import Image from "next/image";
// import { NavbarCenterItem } from "./NavbarCenterItem";
// import AirdropZone from "./AirdropZone";
// import { WalletButton } from "./WalletButton";
// import { useWallet } from "@solana/wallet-adapter-react";
// import { Button } from "@mui/material";

// @todo implement second pretty navbar row
const Footer: FC = () => {
//   const wallet = useWallet();

  return (
    <div>
      <nav className="fixed w-full bottom-0 h-[32px] z-10 backdrop-blur-md bg-[#C0B3A5] text-center text-xs text-[rgb(84,84,84)]">
        Omni is highly experimental software. Use with caution. Inaccurate results may be produced.
      </nav>
    </div>
  );
};

export { Footer };
