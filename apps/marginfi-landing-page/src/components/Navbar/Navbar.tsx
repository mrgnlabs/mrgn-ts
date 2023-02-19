import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { NavbarCenterItem } from "./NavbarCenterItem";
import { Button } from "@mui/material";
import styles from "./Navbar.module.css";

// @todo implement second pretty navbar row
const Navbar: FC = () => {

  return (
    <header>
      <nav className="fixed w-full top-0 h-[64px] z-10 backdrop-blur-md">
        <div
          className="w-full top-0 flex justify-between items-center h-[64px] text-2xl z-10"
          style={{
            border: "solid #1C2125 1px",
            padding: "0 15px",
          }}
        >
          <div className="h-full relative flex justify-start items-center z-10">
            <Link href={"/"} className="relative w-[28.02px] h-[24.81px] mr-4 z-10">
              <Image src="/marginfi_logo.png" alt="marginfi logo" fill />
            </Link>
          </div>
          <div className="absolute fixed left-0 right-0 flex justify-center items-center w-full h-full invisible lg:visible">
            <div
              className="h-full w-[33%] flex min-w-fit max-w-[600px] flex justify-evenly"
            >
              {/* Need links */}
              <Link href={"https://app.marginfi.com/"}>
                <NavbarCenterItem text="Lend" />
              </Link>
              <Link href={"https://app.marginfi.com/earn"}>
                <NavbarCenterItem text="Earn" />
              </Link>
              <Link href={"/earn"}>
                <NavbarCenterItem text="Medium" />
              </Link>
              <Link href={"/earn"}>
                <NavbarCenterItem text="Substack" />
              </Link>
              <Link href={"/earn"}>
                <NavbarCenterItem text="Podcast" />
              </Link>
            </div>
          </div>
          <div className="h-full flex justify-center items-center gap-4 z-10">
            <Link href={"https://marginfi.canny.io/mrgnlend"} className="">
              <Button
                className="h-full w-1/4 min-w-fit max-w-1/4 text-sm flex justify-center items-center normal-case rounded-2xl bg-gradient-to-r to-[#FFF3D0] from-[#C5B893] text-black px-4"
                variant="text"
              >
                Submit Feedback
              </Button>
            </Link>
            {/* <WalletButton /> */}
            <Link href={"https://app.marginfi.com/"} className="">
              <Button
                className={styles["wallet-button"]}
                // className="h-full w-1/4 min-w-fit max-w-1/4 text-sm flex justify-center items-center normal-case rounded-2xl bg-gradient-to-r to-[#FFF3D0] from-[#C5B893] text-black px-4"
                variant="text"
              >
                Go to App
              </Button>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};

export { Navbar };
