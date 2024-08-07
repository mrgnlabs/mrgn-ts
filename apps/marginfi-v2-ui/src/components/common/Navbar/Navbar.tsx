import { FC, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/router";

import { PublicKey } from "@solana/web3.js";
import LipAccount from "@mrgnlabs/lip-client/src/account";

import { useMrgnlendStore, useUiStore } from "~/store";
import { useLipClient } from "~/context";
import { cn, collectRewardsBatch } from "~/utils";
import { useFirebaseAccount } from "~/hooks/useFirebaseAccount";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { useIsMobile } from "~/hooks/useIsMobile";

import { WalletButton } from "~/components/common/Wallet";
import { EMISSION_MINT_INFO_MAP } from "~/components/desktop/AssetList/components";
import { DialectNotification } from "~/components/common/Notifications";
import { IconMrgn } from "~/components/ui/icons";

// @todo implement second pretty navbar row
export const Navbar: FC = () => {
  useFirebaseAccount();

  const { connection } = useConnection();
  const isMobile = useIsMobile();
  const { wallet, walletAddress } = useWalletContext();
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

  const [isOraclesStale, priorityFee] = useUiStore((state) => [state.isOraclesStale, state.priorityFee]);

  const [lipAccount, setLipAccount] = useState<LipAccount | null>(null);

  useEffect(() => {
    if (!walletAddress && lendUserDataFetched) {
      resetLendUserData();
    }
  }, [walletAddress, lendUserDataFetched, resetLendUserData]);

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
    (async function () {
      if (!mfiClient || !lipClient || !walletAddress) return;
      const lipAccount = await LipAccount.fetch(walletAddress, lipClient, mfiClient);
      setLipAccount(lipAccount);
    })();
  }, [lipClient, mfiClient, walletAddress]);

  return (
    <header className="h-[64px] mb-4 md:mb-8 lg:mb-14">
      <nav className={cn("fixed w-full top-0 h-[64px] z-50 bg-background", isOraclesStale && "top-16 md:top-10")}>
        <div className="w-full flex justify-between items-center h-16 text-sm font-[500] text-[#868E95] z-10 border-b-[0.5px] border-[#1C2125] px-4">
          <div className="h-full w-1/2 z-10 flex items-center gap-8">
            <Link
              href="/"
              className="h-[35.025px] w-[31.0125px] min-h-[35.025px] min-w-[31.0125px] flex justify-center items-center text-white"
            >
              <IconMrgn size={35} />
            </Link>

            <div className="hidden lg:flex justify-start items-center gap-8">
              <Link
                href={"/"}
                className={`${
                  router.pathname === "/" ? "text-primary hover-underline-static" : "hover-underline-animation"
                }`}
              >
                lend
              </Link>

              <Link
                href={"/stake"}
                className={
                  router.pathname === "/stake" ? "text-primary hover-underline-static" : "hover-underline-animation"
                }
              >
                stake
              </Link>

              <Link
                href={"/looper"}
                className={
                  router.pathname === "/looper" ? "text-primary hover-underline-static" : "hover-underline-animation"
                }
              >
                looper
              </Link>

              <Link
                href={"/portfolio"}
                className={`${
                  router.pathname === "/portfolio" ? "text-primary hover-underline-static" : "hover-underline-animation"
                } whitespace-nowrap`}
              >
                portfolio
              </Link>

              {lipAccount && lipAccount.deposits.length > 0 && (
                <Link
                  href={"/earn"}
                  className={
                    router.pathname === "/earn" ? "text-primary hover-underline-static" : "hover-underline-animation"
                  }
                >
                  earn
                </Link>
              )}

              <Link
                href="/ecosystem"
                className={`${
                  router.pathname === "/ecosystem" ? "text-primary hover-underline-static" : "hover-underline-animation"
                } whitespace-nowrap`}
              >
                ecosystem
              </Link>
            </div>
          </div>
          {initialized && (
            <div className="h-full w-1/2 flex justify-end items-center z-10 gap-4 lg:gap-8 text-[#868E95]">
              <div
                className={`whitespace-nowrap inline-flex mr-4 md: mr-0 ${
                  bankAddressesWithEmissions.length > 0 ? "cursor-pointer hover:text-[#AAA]" : "cursor-not-allowed"
                }`}
                onClick={async () => {
                  if (!wallet || !selectedAccount || bankAddressesWithEmissions.length === 0) return;
                  await collectRewardsBatch(selectedAccount, bankAddressesWithEmissions, priorityFee);
                }}
              >
                {!isMobile && "collect"} rewards
                {bankAddressesWithEmissions.length > 0 && (
                  <span className="relative flex h-1 w-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DCE85D] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1 w-1 bg-[#DCE85DAA]"></span>
                  </span>
                )}
              </div>

              <DialectNotification />

              <WalletButton />
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
