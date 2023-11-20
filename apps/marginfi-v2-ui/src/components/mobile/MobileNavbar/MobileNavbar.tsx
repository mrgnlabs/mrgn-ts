import { FC, useEffect, useMemo } from "react";
import Link from "next/link";
import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";
import { useRouter } from "next/router";
import { useFirebaseAccount } from "~/hooks/useFirebaseAccount";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useOs } from "~/hooks/useOs";
import { cn } from "~/utils/themeUtils";
import { MenuModal } from "./MenuModal";
import { ORDERED_MOBILE_NAVBAR_LINKS } from "~/config/navigationLinks";
import { useSwipeGesture } from "~/hooks/useSwipeGesture";
import { useLstStore } from "~/pages/stake";
import { PWABanner } from "~/components/mobile/PWABanner";

const MobileNavbar: FC = () => {
  useFirebaseAccount();

  const { walletAddress } = useWalletContext();
  const router = useRouter();
  const [isMenuModalOpen, setIsMenuModalOpen] = useUiStore((state) => [
    state.isMenuDrawerOpen,
    state.setIsMenuDrawerOpen,
  ]);
  const [fetchPoints] = useUserProfileStore((state) => [state.fetchPoints]);
  const [lendUserDataFetched, resetLendUserData] = useMrgnlendStore((state) => [
    state.userDataFetched,
    state.resetUserData,
  ]);
  const [lstUserDataFetched, resetLstUserData] = useLstStore((state) => [state.userDataFetched, state.resetUserData]);

  const { isIOS } = useOs();

  useSwipeGesture(() => setIsMenuModalOpen(true));

  useEffect(() => {
    if (!walletAddress) return;
    fetchPoints(walletAddress.toBase58()).catch(console.error);
  }, [fetchPoints, walletAddress]);

  useEffect(() => {
    if (!walletAddress && lendUserDataFetched) {
      resetLendUserData();
    }
    if (!walletAddress && lstUserDataFetched) {
      resetLstUserData();
    }
  }, [walletAddress, lendUserDataFetched, resetLendUserData, lstUserDataFetched, resetLstUserData]);

  const activeLink = useMemo(() => {
    const activeLinkIndex = ORDERED_MOBILE_NAVBAR_LINKS.findIndex((link) => link.href === router.pathname);
    return activeLinkIndex >= 0 ? `link${activeLinkIndex}` : "linknone";
  }, [router.pathname]);

  return (
    <header>
      <PWABanner />
      <nav className="fixed w-full bottom-0 z-50 bg-[#0F1111]">
        <div className="h-full w-full text-sm font-[500] text-[#868E95] z-50 flex justify-around relative lg:gap-8">
          {ORDERED_MOBILE_NAVBAR_LINKS.map((linkInfo, index) => {
            const isActive = activeLink === `link${index}`;
            return (
              <Link
                key={linkInfo.label}
                onClick={() => linkInfo.label === "more" && setIsMenuModalOpen(true)}
                href={linkInfo.href}
                className={cn(
                  "w-1/4 pt-3 flex flex-col items-center",
                  isIOS ? "pb-7" : "pb-3",
                  isActive ? "text-[#DCE85D]" : "text-[#999]"
                )}
              >
                <linkInfo.Icon />
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
      <MenuModal isOpen={isMenuModalOpen} handleClose={() => setIsMenuModalOpen(false)} />
    </header>
  );
};

export { MobileNavbar };
