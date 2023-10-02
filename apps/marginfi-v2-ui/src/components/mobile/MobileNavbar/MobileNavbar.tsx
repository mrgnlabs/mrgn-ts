import { FC, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUserProfileStore } from "~/store";
import { useRouter } from "next/router";
import { useFirebaseAccount } from "~/hooks/useFirebaseAccount";
import { useWalletContext } from "~/hooks/useWalletContext";
import { MoreModal } from "./MoreModal";
import { ORDERED_MOBILE_NAVBAR_LINKS } from "~/config/navigationLinks";
import { Apps } from "@mui/icons-material";
import { useSwipeGesture } from "~/hooks/useSwipeGesture";

// @todo implement second pretty navbar row
const MobileNavbar: FC = () => {
  useFirebaseAccount();

  const { walletAddress } = useWalletContext();
  const router = useRouter();
  const [fetchPoints] = useUserProfileStore((state) => [state.fetchPoints]);

  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    fetchPoints(walletAddress.toBase58()).catch(console.error);
  }, [fetchPoints, walletAddress]);

  const activeLink = useMemo(() => {
    const activeLinkIndex = ORDERED_MOBILE_NAVBAR_LINKS.findIndex((link) => link.href === router.pathname);
    return activeLinkIndex >= 0 ? `link${activeLinkIndex + 1}` : null;
  }, [router.pathname]);

  useSwipeGesture(() => setIsMoreModalOpen(true));

  return (
    <header>
      <nav className="fixed w-full bottom-0 h-[68px] z-50 bg-[#0F1111]">
        <div className="h-full w-full text-sm font-[500] text-[#868E95] z-50 flex justify-around relative items-center z-10 lg:gap-8">
          <div
            className="w-1/4 h-full flex flex-col justify-center items-center"
            onClick={() => setIsMoreModalOpen(!isMoreModalOpen)}
          >
            <Apps className="w-[18.9px] h-[18.9px]" />
            <div className={`font-aeonik font-[400] text-[#999]`}>
            more
            </div>
          </div>
          {ORDERED_MOBILE_NAVBAR_LINKS.map((linkInfo, index) => {
            const isActive = activeLink === `link${index + 1}`;
            return (
              <Link
                key={linkInfo.label}
                href={linkInfo.href}
                className={`w-1/4 h-full flex flex-col justify-center items-center ${
                  isActive ? "current-mobile-nav-link" : ""
                }`}
              >
                <linkInfo.Icon className="w-[18.9px] h-[18.9px]" color={isActive ? "#DCE85D" : "#999"} />
                <div className={`font-aeonik font-[400] ${isActive ? "text-[#DCE85D]" : "text-[#999]"}`}>
                  {linkInfo.label}
                </div>
              </Link>
            );
          })}

          <div className={`w-full absolute top-[1px] border-t-[1px] border-[#333]`} />
          <div className={`border-slider ${activeLink}`} />
        </div>
      </nav>
      <MoreModal isOpen={isMoreModalOpen} handleClose={() => setIsMoreModalOpen(false)} />
    </header>
  );
};

export { MobileNavbar };
