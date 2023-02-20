import { FC } from "react";
import Link from "next/link";
import { NavbarCenterItem } from "./NavbarCenterItem";

const Footer: FC = () => (
    <header>
      <nav className="fixed w-full bottom-0 h-[64px] z-10">
        <div
          className="w-full top-0 flex justify-between items-center h-[64px] text-2xl z-10"
          style={{
            padding: "0 15px",
          }}
        >
          <div className="h-full relative flex justify-start items-center z-10">
            <Link href={"https://app.marginfi.com/"}>
              <NavbarCenterItem text="Docs" disabled/>
            </Link>
            <Link href={"https://github.com/mrgnlabs"}>
              <NavbarCenterItem text="Github" />
            </Link>
          </div>
          <div className="absolute fixed left-0 right-0 flex justify-center items-center w-full h-full invisible lg:visible">
            <div className="h-full w-[28%] flex min-w-fit max-w-[600px] justify-center items-center">
              <Link href={"https://app.marginfi.com/"}>
                <NavbarCenterItem text="marginfi is a decentralized lending and borrowing protocol on Solana." />
              </Link>
            </div>
          </div>
          <div className="h-full relative flex justify-start items-center z-10">
            <Link href={"https://t.me/mrgncommunity"}>
              <NavbarCenterItem text="Telegram" />
            </Link>
            <Link href={"https://twitter.com/marginfi"}>
              <NavbarCenterItem text="Twitter" />
            </Link>
            <Link href={"https://discord.gg/wbKERVhQcs"}>
              <NavbarCenterItem text="Discord" />
            </Link>
            <Link href={"https://app.marginfi.com/"}>
              <NavbarCenterItem text="© 2023 MRGN, Inc." disabled/>
            </Link>
          </div>
        </div>
      </nav>
    </header>
);

export { Footer };
