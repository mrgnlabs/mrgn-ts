import { FC } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import Image from "next/image";
import Button from "@mui/material/Button";
import LockIcon from "@mui/icons-material/Lock";
import dynamic from "next/dynamic";
import styles from "./Navbar.module.css";

// ================================
// ================================
// 1. Navbar

// @todo implement second pretty navbar row
const Navbar: FC = () => {
  const wallet = useWallet();

  return wallet.connected || process.env.NODE_ENV === "development" ? (
    <header>
      <nav className="fixed w-full top-0 h-[56px] z-10">
        <div
          className="w-full top-0 flex justify-between items-center h-[56px] text-2xl z-10"
          style={{
            border: "solid #1C2125 1px",
            padding: "0 15px",
          }}
        >
          <div className="h-full relative flex justify-start items-center z-10">
            <Link
              href={"/"}
              className="relative w-[18.68px] h-[16.54px] mr-4 z-10"
            >
              <Image src="/marginfi_logo.png" alt="marginfi logo" fill />
            </Link>
          </div>

          {/* // @todo spacing between items looks weird at lg breakpoint */}
          <div className="absolute fixed left-0 right-0 flex justify-center items-center w-full h-full invisible lg:visible">
            <div className="h-full w-[28%] flex">
              <NavbarCenterItem text="mrgnlend" textFormat="lowercase" />
              <NavbarCenterItem text="Markets" disabled />
              <NavbarCenterItem text="Strategies" disabled />
              <NavbarCenterItem text="Trade" disabled />
            </div>
          </div>
          <div className="h-full flex justify-center items-center gap-[10px] z-10">
            <WalletButton />
          </div>
        </div>
      </nav>
    </header>
  ) : (
    <></>
  );
};

// ================================
// 1a. Navbar

interface NavbarCenterItemProps {
  text: string;
  // icon?: any;
  textFormat?: string;
  disabled?: boolean;
}

const NavbarCenterItem: FC<NavbarCenterItemProps> = ({
  text,
  // icon,
  textFormat,
  disabled,
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
  >
    {text}
    {disabled ? <LockIcon className="h-[14px] w-[14px] ml-2" /> : <></>}
  </Button>
);

// 1a. Navbar
// ================================

// ================================
// 1b. Dynamic wallet

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletButton: FC = () => (
  <WalletMultiButtonDynamic
    className={styles["wallet-button"]}
    // @todo height / width doesn't seem to be making a difference here
    startIcon={
      <Image
        src="/wallet_icon.svg"
        alt="wallet icon"
        width={18.9}
        height={18.9}
      />
    }
  />
);

// 1b. Dynamic wallet
// ================================

// 1. Navbar
// ================================
// ================================

export { Navbar };
