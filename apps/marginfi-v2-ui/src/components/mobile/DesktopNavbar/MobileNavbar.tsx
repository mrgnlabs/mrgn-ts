import { FC, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import AirdropZone from "./AirdropZone";
import { useUserProfileStore } from "~/store";
import { useRouter } from "next/router";
import { useFirebaseAccount } from "~/hooks/useFirebaseAccount";
import { useWalletContext } from "~/hooks/useWalletContext";

// @todo implement second pretty navbar row
const MobileNavbar: FC = () => {
  useFirebaseAccount();

  const { connected, walletAddress } = useWalletContext();
  const router = useRouter();
  const [fetchPoints] = useUserProfileStore((state) => [state.fetchPoints]);

  useEffect(() => {
    if (!walletAddress) return;
    fetchPoints(walletAddress.toBase58()).catch(console.error);
  }, [fetchPoints, walletAddress]);

  return (
    <header>
      <nav className="fixed w-full bottom-0 h-[64px] z-20 bg-[#333]">
        <div className="w-full top-0 flex justify-between items-center h-16 text-sm font-[500] text-[#868E95] z-10 border-b-[0.5px] border-[#1C2125] px-4">
          <div className="h-full w-1/2 flex justify-start items-center z-10 gap-4 lg:gap-8">
            <Link
              href={"https://app.marginfi.com"}
              className="h-[35.025px] w-[31.0125px] min-h-[35.025px] min-w-[31.0125px] flex justify-center items-center"
            >
              <Image src="/marginfi_logo.png" alt="marginfi logo" height={35.025} width={31.0125} />
            </Link>
            <Link
              href={"/"}
              className={`${
                router.pathname === "/" ? "hover-underline-static" : "hover-underline-animation"
              } hidden md:block`}
            >
              lend
            </Link>

            <Link
              href={"/swap"}
              className={`${router.pathname === "/swap" ? "hover-underline-static" : "hover-underline-animation"}`}
            >
              swap
            </Link>
            <Link
              href={"/bridge"}
              className={`${router.pathname === "/bridge" ? "hover-underline-static" : "hover-underline-animation"}`}
            >
              bridge
            </Link>

            <Link
              href={"/earn"}
              className={`${
                router.pathname === "/earn" ? "hover-underline-static" : "hover-underline-animation"
              } hidden md:block`}
            >
              earn
            </Link>

            <Link href={"https://omni.marginfi.com"} className="hover-underline-animation hidden md:block">
              omni
            </Link>
            {process.env.NEXT_PUBLIC_MARGINFI_FEATURES_AIRDROP === "true" && connected && <AirdropZone />}
          </div>
        </div>
      </nav>
    </header>
  );
};

export { MobileNavbar };
