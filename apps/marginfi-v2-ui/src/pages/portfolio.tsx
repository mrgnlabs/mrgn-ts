import React from "react";

import { useRouter } from "next/router";
import Link from "next/link";

import FileCopyIcon from "@mui/icons-material/FileCopy";
import CheckIcon from "@mui/icons-material/Check";
import { CopyToClipboard } from "react-copy-to-clipboard";

import config from "~/config/marginfi";
import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { PageHeader } from "~/components/common/PageHeader";
import {
  PointsOverview,
  PointsSignIn,
  PointsSignUp,
  PointsCheckingUser,
  PointsConnectWallet,
} from "~/components/desktop/Points";
import { EmissionsBanner } from "~/components/mobile/EmissionsBanner";
import { Portfolio } from "~/components/common/Portfolio";
import { MobileAccountSummary } from "~/components/mobile/MobileAccountSummary";
import { MobilePointsOverview } from "~/components/mobile/Points";
import { Button } from "~/components/ui/button";

const PortfolioPage = () => {
  const { connected, wallet, isOverride } = useWalletContext();
  const { query: routerQuery } = useRouter();
  const { connection } = useConnection();
  const [fetchMrgnlendState, setIsRefreshingStore] = useMrgnlendStore((state) => [
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
        <EmissionsBanner />
        {!connected ? (
          <PointsConnectWallet />
        ) : userPointsData ? (
          <MobilePointsOverview userPointsData={userPointsData} />
        ) : (
          <PointsCheckingUser />
        )}
        <div className="flex flex-wrap justify-center items-center gap-5">
          <a
            href="https://medium.com/marginfi/introducing-mrgn-points-949e18f31a8c"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button>How do points work?</Button>
          </a>
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
            <Button>
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
