import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@mui/material";


const Footer: FC = () => {
  const wallet = useWallet();

  return (
    <header>
      <div
        className="fixed w-full bottom-0 h-[34px] z-20 backdrop-blur-md"
      >
        <div
          className="w-full bottom-0 flex justify-between items-center h-[34px] text-2xl z-10"
          style={{
            border: "solid #1C2125 1px",
            padding: "0 15px",
          }}
        >          
        </div>
      </div>
    </header>
  );
};

export { Footer };
