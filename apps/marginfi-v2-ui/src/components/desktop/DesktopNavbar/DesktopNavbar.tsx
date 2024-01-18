import { FC, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useHotkeys } from "react-hotkeys-hook";
import { useMrgnlendStore, useUserProfileStore } from "~/store";
import { useLipClient } from "~/context";
import { useRouter } from "next/router";
import { HotkeysEvent } from "react-hotkeys-hook/dist/types";
import { Badge } from "@mui/material";
import { useFirebaseAccount } from "~/hooks/useFirebaseAccount";
import { groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Features, isActive } from "~/utils/featureGates";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "~/hooks/useConnection";
import { EMISSION_MINT_INFO_MAP } from "../AssetsList/AssetRow";
import { collectRewardsBatch } from "~/utils";
import { IconMrgn } from "~/components/ui/icons";
import { useLstStore } from "~/pages/stake";
import { WalletButton } from "~/components/common/Wallet";
import LipAccount from "@mrgnlabs/lip-client/src/account";

// @todo implement second pretty navbar row
const DesktopNavbar: FC = () => {
  useFirebaseAccount();

  const { connection } = useConnection();
  const { connected, wallet, walletAddress } = useWalletContext();
  const router = useRouter();
  const { lipClient } = useLipClient();
  const [initialized, mfiClient, selectedAccount, extendedBankInfos, lendUserDataFetched, resetLendUserData] =
    useMrgnlendStore((state) => [
      state.initialized,
      state.marginfiClient,
      state.selectedAccount,
      state.extendedBankInfos,
      state.userDataFetched,
      state.resetUserData,
    ]);
  const [lstUserDataFetched, resetLstUserData] = useLstStore((state) => [state.userDataFetched, state.resetUserData]);
  const [showBadges, currentFirebaseUser, userPointsData, setShowBadges, fetchPoints] = useUserProfileStore((state) => [
    state.showBadges,
    state.currentFirebaseUser,
    state.userPointsData,
    state.setShowBadges,
    state.fetchPoints,
  ]);

  const [isHotkeyMode, setIsHotkeyMode] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(router.pathname);
  const [lipAccount, setLipAccount] = useState<LipAccount | null>(null);

  useEffect(() => {
    if (!walletAddress && lendUserDataFetched) {
      resetLendUserData();
    }
    if (!walletAddress && lstUserDataFetched) {
      resetLstUserData();
    }
  }, [walletAddress, lendUserDataFetched, resetLendUserData, lstUserDataFetched, resetLstUserData]);

  const bankAddressesWithEmissions: PublicKey[] = useMemo(() => {
    if (!selectedAccount) return [];
    return [...EMISSION_MINT_INFO_MAP.keys()]
      .map((bankMintSymbol) => {
        const uxdBankInfo = extendedBankInfos?.find((b) => b.isActive && b.meta.tokenSymbol === bankMintSymbol);
        return uxdBankInfo?.address;
      })
      .filter((address) => address !== undefined) as PublicKey[];
  }, [selectedAccount, extendedBankInfos]);

  useEffect(() => {
    if (!walletAddress) return;
    fetchPoints(walletAddress.toBase58()).catch(console.error);
  }, [fetchPoints, walletAddress]);

  useEffect(() => {
    setCurrentRoute(router.pathname);
  }, [router.pathname]);

  useEffect(() => {
    (async function () {
      if (!mfiClient || !lipClient || !walletAddress) return;
      const lipAccount = await LipAccount.fetch(walletAddress, lipClient, mfiClient);
      setLipAccount(lipAccount);
    })();
  }, [lipClient, mfiClient, walletAddress]);

  // Enter hotkey mode
  useHotkeys(
    "meta+k",
    () => {
      setIsHotkeyMode(true);
      setShowBadges(true);

      setTimeout(() => {
        setIsHotkeyMode(false);
        setShowBadges(false);
      }, 5000);
    },
    { preventDefault: true, enableOnFormTags: true }
  );

  // Navigation in hotkey mode
  useHotkeys(
    "l, s+1, s+2, b, e, o",
    (_, handler: HotkeysEvent) => {
      if (isHotkeyMode) {
        switch (handler.keys?.join("")) {
          case "l":
            router.push("/");
            break;
          case "s1":
            router.push("/stake");
            break;
          case "s2":
            router.push("/swap");
            break;
          case "b":
            router.push("/bridge");
            break;
          case "o":
            router.push("https://omni.marginfi.com");
            break;
        }
        setIsHotkeyMode(false);
        setShowBadges(false);
      }
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "meta+k",
    () => {
      setShowBadges(true);
      setIsHotkeyMode(true);
      setTimeout(() => {
        setShowBadges(false);
        setIsHotkeyMode(false);
      }, 5000);
    },
    { enableOnFormTags: true }
  );

  return (
    <header>
      <nav className="fixed w-full top-0 h-[64px] z-30 bg-[#0F1111]">
        <div className="w-full top-0 flex justify-between items-center h-16 text-sm font-[500] text-[#868E95] z-10 border-b-[0.5px] border-[#1C2125] px-4">
          <div className="h-full w-1/2 flex justify-start items-center z-10 gap-4 lg:gap-8">
            <Link
              href="/"
              className="h-[35.025px] w-[31.0125px] min-h-[35.025px] min-w-[31.0125px] flex justify-center items-center text-white"
            >
              <IconMrgn size={35} />
            </Link>
            <Badge
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: "rgb(220, 232, 93)",
                  color: "#1C2125",
                },
              }}
              badgeContent={"l"}
              invisible={!showBadges}
            >
              <Link
                href={"/"}
                className={`${
                  router.pathname === "/" ? "hover-underline-static" : "hover-underline-animation"
                } hidden md:block`}
              >
                lend
              </Link>
            </Badge>

            {isActive(Features.STAKE) && (
              <Badge
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                sx={{
                  "& .MuiBadge-badge": {
                    backgroundColor: "rgb(220, 232, 93)",
                    color: "#1C2125",
                  },
                }}
                badgeContent={"s1"}
                invisible={!showBadges}
              >
                <Link
                  href={"/stake"}
                  className={router.pathname === "/stake" ? "hover-underline-static" : "hover-underline-animation"}
                >
                  stake
                </Link>
              </Badge>
            )}

            {lipAccount && lipAccount.deposits.length > 0 && (
              <Badge
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                sx={{
                  "& .MuiBadge-badge": {
                    backgroundColor: "rgb(220, 232, 93)",
                    color: "#1C2125",
                  },
                }}
                badgeContent={"e"}
                invisible={!showBadges}
              >
                <Link
                  href={"/earn"}
                  className={router.pathname === "/earn" ? "hover-underline-static" : "hover-underline-animation"}
                >
                  earn
                </Link>
              </Badge>
            )}

            <Badge
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: "rgb(220, 232, 93)",
                  color: "#1C2125",
                },
              }}
              badgeContent={"s2"}
              invisible={!showBadges}
            >
              <Link
                href={"/swap"}
                className={`${
                  router.pathname === "/swap" ? "hover-underline-static" : "hover-underline-animation"
                } hidden md:block`}
              >
                swap
              </Link>
            </Badge>
            <Badge
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: "rgb(220, 232, 93)",
                  color: "#1C2125",
                },
              }}
              badgeContent={"b"}
              invisible={!showBadges}
            >
              <Link
                href={"/bridge"}
                className={`${
                  router.pathname === "/bridge" ? "hover-underline-static" : "hover-underline-animation"
                } hidden md:block`}
              >
                bridge
              </Link>
            </Badge>

            <Link
              href={"/points"}
              className={`${
                router.pathname === "/points" ? "hover-underline-static" : "hover-underline-animation"
              } whitespace-nowrap`}
            >
              {connected &&
                currentFirebaseUser &&
                userPointsData.totalPoints > 0 &&
                groupedNumberFormatterDyn.format(Math.round(userPointsData.totalPoints))}{" "}
              points
            </Link>

            <Badge
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: "rgb(220, 232, 93)",
                  color: "#1C2125",
                },
              }}
              badgeContent={"o"}
              invisible={!showBadges}
              className="hidden md:block"
            >
              <Link href="/ecosystem" className="hover-underline-animation hidden md:block">
                ecosystem
              </Link>
            </Badge>
          </div>
          {initialized && (
            <div className="h-full w-1/2 flex justify-end items-center z-10 gap-4 lg:gap-8 text-[#868E95]">
              <div
                className={`whitespace-nowrap hidden md:inline-flex ${
                  bankAddressesWithEmissions.length > 0 ? "cursor-pointer hover:text-[#AAA]" : "cursor-not-allowed"
                }`}
                onClick={async () => {
                  if (!wallet || !selectedAccount || bankAddressesWithEmissions.length === 0) return;
                  await collectRewardsBatch(connection, wallet, selectedAccount, bankAddressesWithEmissions);
                }}
              >
                collect rewards
                {bankAddressesWithEmissions.length > 0 && (
                  <span className="relative flex h-1 w-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DCE85D] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1 w-1 bg-[#DCE85DAA]"></span>
                  </span>
                )}
              </div>

              <WalletButton />
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export { DesktopNavbar };
