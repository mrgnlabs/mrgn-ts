import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@mui/material";

const Home = () => {
  return (
    <>
      <div className="fixed top-[-10vw] right-[-25vw] md:top-[-25vw] md:right-[-25vw] w-[100vw] h-[67vw]">
        <Image src="/hero.jpg" alt="marginfi logo" fill />
      </div>

      <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl">
        <div className="mb-6 max-w-7xl">Connecting liquidity</div>
        <div className="mb-6 max-w-7xl">across DeFi</div>
        <Link href={"https://app.marginfi.com"}>
          <Button
            className="h-full w-[200px] min-w-fit text-xl flex justify-center items-center font-light normal-case rounded-[100px] h-12"
            variant="text"
            style={{
              backgroundColor: "#DCE85D",
              color: "#000",
              fontFamily: "Aeonik Pro",
              fontWeight: 700,
            }}
          >
            Launch App
          </Button>
        </Link>
      </div>
    </>
  );
};

export default Home;
