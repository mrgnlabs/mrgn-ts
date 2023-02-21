import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { NavbarCenterItem } from "./NavbarCenterItem";
import { Button } from "@mui/material";
import styles from "./Navbar.module.css";

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
            <div className="h-full w-[28%] flex min-w-fit max-w-[600px] flex justify-evenly">
              <Link href={"https://medium.com/marginfi"} className="w-1/3 min-w-1/3 max-w-1/3">
                <NavbarCenterItem text="Medium" />
              </Link>
              <Link href={"https://mrgn.substack.com/"} className="w-1/3 min-w-1/3 max-w-1/3">
                <NavbarCenterItem text="Substack" />
              </Link>
              <Link href={"https://open.spotify.com/show/0sgdNFaGijvlT5y9BeQ97l"} className="w-1/3 min-w-1/3 max-w-1/3">
                <NavbarCenterItem text="Podcast" />
              </Link>
            </div>
          </div>
          <div className="h-full flex justify-center items-center gap-4 z-10">
            <Link href={"https://app.marginfi.com/"} className="">
              <Button className={styles["wallet-button"]} variant="text">
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};

export { Navbar };
