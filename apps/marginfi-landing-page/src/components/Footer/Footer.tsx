import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { NavbarCenterItem } from "./NavbarCenterItem";
import { Button } from "@mui/material";
import styles from "./Footer.module.css";

// @todo implement second pretty navbar row
const Footer: FC = () => {

  return (
    <header>
      <nav className="fixed w-full bottom-0 h-[64px] z-10 backdrop-blur-md">
        <div
          className="w-full top-0 flex justify-between items-center h-[64px] text-2xl z-10"
          style={{
            // border: "solid #1C2125 1px",
            padding: "0 15px",
          }}
        >
          <div className="h-full relative flex justify-start items-center z-10">
            <Link href={"https://app.marginfi.com/"}>
              <NavbarCenterItem text="Docs" />
            </Link>
            <Link href={"https://app.marginfi.com/"}>
              <NavbarCenterItem text="Github" />
            </Link>
            {/* <Link href={"/"} className="relative w-[28.02px] h-[24.81px] mr-4 z-10">
              <Image src="/marginfi_logo.png" alt="marginfi logo" fill />
            </Link> */}
          </div>
          <div className="h-full relative flex justify-start items-center z-10">
            <Link href={"https://app.marginfi.com/"}>
              <NavbarCenterItem text="Twitter" />
            </Link>
            <Link href={"https://app.marginfi.com/"}>
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
};

export { Footer };
