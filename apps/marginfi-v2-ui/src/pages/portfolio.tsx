import React from "react";

import { useRouter } from "next/router";
import Link from "next/link";

import { Button } from "@mui/material";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import CheckIcon from "@mui/icons-material/Check";
import { CopyToClipboard } from "react-copy-to-clipboard";

import config from "~/config/marginfi";
import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { PageHeader } from "~/components/common/PageHeader";
import { PointsOverview, PointsSignIn, PointsSignUp, PointsCheckingUser } from "~/components/desktop/Points";
import { EmissionsBanner } from "~/components/mobile/EmissionsBanner";
import { Portfolio } from "~/components/common/Portfolio";

const PortfolioPage = () => {
  const { connected, wallet, isOverride } = useWalletContext();
  const { query: routerQuery } = useRouter();
  const { connection } = useConnection();
  const [isStoreInitialized, sortedBanks, nativeSolBalance, selectedAccount, fetchMrgnlendState, setIsRefreshingStore] =
    useMrgnlendStore((state) => [
      state.initialized,
      state.extendedBankInfos,
      state.nativeSolBalance,
      state.selectedAccount,
      state.fetchMrgnlendState,
      state.setIsRefreshingStore,
    ]);
  const [currentFirebaseUser, hasUser, userPointsData] = useUserProfileStore((state) => [
    state.currentFirebaseUser,
    state.hasUser,
    state.userPointsData,
  ]);
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);

  const referralCode = React.useMemo(() => routerQuery.referralCode as string | undefined, [routerQuery.referralCode]);
  const [isReferralCopied, setIsReferralCopied] = React.useState(false);

  React.useEffect(() => {
    setIsRefreshingStore(true);
    fetchMrgnlendState({ marginfiConfig: config.mfiConfig, connection, wallet, isOverride }).catch(console.error);
    const id = setInterval(() => {
      setIsRefreshingStore(true);
      fetchMrgnlendState().catch(console.error);
    }, 30_000);
    return () => clearInterval(id);
  }, [wallet, isOverride]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ crucial to omit both `connection` and `fetchMrgnlendState` from the dependency array
  // TODO: fix...

  return (
    <>
      <PageHeader>portfolio</PageHeader>
      <div className="flex flex-col w-full h-full justify-start items-center px-4 gap-6 mb-20">
        {/* <MobileAccountSummary /> */}
        <EmissionsBanner />
        {/* <MobilePortfolioOverview /> */}
        {!connected ? null : currentFirebaseUser ? (
          <PointsOverview userPointsData={userPointsData} />
        ) : hasUser === null ? (
          <PointsCheckingUser />
        ) : hasUser ? (
          <PointsSignIn />
        ) : (
          <PointsSignUp referralCode={referralCode} />
        )}
        <div className="flex flex-wrap justify-center items-center gap-5">
          <Button
            className="normal-case text-lg font-aeonik w-[92%] min-h-[60px] rounded-[45px] whitespace-nowrap min-w-[260px] max-w-[260px]"
            style={{
              backgroundColor: "rgb(227, 227, 227)",
              border: "none",
              color: "black",
              zIndex: 10,
            }}
            component="a"
            href="https://medium.com/marginfi/introducing-mrgn-points-949e18f31a8c"
            target="_blank"
            rel="noopener noreferrer"
          >
            How do points work?
          </Button>
          <CopyToClipboard
            text={`https://www.mfi.gg/refer/${userPointsData.referralLink}`}
            onCopy={() => {
              if (userPointsData.referralLink && userPointsData.referralLink.length > 0) {
                setIsReferralCopied(true);
                setTimeout(() => setIsReferralCopied(false), 2000);
              } else {
                setIsWalletAuthDialogOpen(true);
              }
            }}
          >
            <Button
              className={`normal-case text-lg font-aeonik w-[92%] min-h-[60px] rounded-[45px] gap-2 whitespace-nowrap min-w-[260px] max-w-[260px]`}
              style={{
                backgroundImage: userPointsData.isCustomReferralLink
                  ? "radial-gradient(ellipse at center, #fff 0%, #fff 10%, #DCE85D 60%, #DCE85D 100%)"
                  : "none",
                backgroundColor: userPointsData.isCustomReferralLink ? "transparent" : "rgb(227, 227, 227)",

                border: "none",
                color: "black",
                zIndex: 10,
              }}
            >
              {isReferralCopied
                ? "Link copied"
                : `${
                    userPointsData.isCustomReferralLink
                      ? userPointsData.referralLink?.replace("https://", "")
                      : "Copy referral link"
                  }`}
              {isReferralCopied ? <CheckIcon /> : <FileCopyIcon />}
            </Button>
          </CopyToClipboard>
        </div>
        <div className="text-center text-[#868E95] text-xs flex justify-center gap-1">
          <div>We reserve the right to update point calculations at any time.</div>
          <div>
            <Link href="/terms/points" style={{ textDecoration: "underline" }}>
              Terms.
            </Link>
          </div>
        </div>
        <Portfolio />
      </div>
    </>
  );
};

export default PortfolioPage;
