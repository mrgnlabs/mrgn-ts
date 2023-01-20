import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { NavbarCenterItem } from "./NavbarCenterItem";
import AirdropZone from "./AirdropZone";
import { WalletButton } from "./WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";

// @todo implement second pretty navbar row
const Navbar: FC = () => {
  const wallet = useWallet();

  return (
    <header>
      <nav className="fixed w-full top-0 h-[56px] z-10 backdrop-blur-md">
        <div
          className="w-full top-0 flex justify-between items-center h-[64px] text-2xl z-10"
          style={{
            border: "solid #1C2125 1px",
            padding: "0 15px",
          }}
        >
          <div className="h-full relative flex justify-start items-center z-10">
            <Link
              href={"/"}
              className="relative w-[28.02px] h-[24.81px] mr-4 z-10"
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
              {wallet.connected && <AirdropZone />}
            </div>
          </div>
          <div className="h-full flex justify-center items-center gap-[10px] z-10">
            <WalletButton />
          </div>
        </div>
      </nav>
    </header>
  );
};

export { Navbar };
