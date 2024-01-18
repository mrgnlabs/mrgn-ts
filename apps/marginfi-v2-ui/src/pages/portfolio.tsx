import React from "react";

import Link from "next/link";

import { NextSeo } from "next-seo";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import CheckIcon from "@mui/icons-material/Check";
import { CopyToClipboard } from "react-copy-to-clipboard";

import { useUiStore, useUserProfileStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { PageHeader } from "~/components/common/PageHeader";
import { PointsConnectWallet } from "~/components/desktop/Points";
import { EmissionsBanner } from "~/components/mobile/EmissionsBanner";
import { Portfolio } from "~/components/common/Portfolio";
import { Button } from "~/components/ui/button";
import { MobilePointsOverview } from "~/components/mobile/Points/MobilePointsOverview";

const PortfolioPage = () => {
  const { connected } = useWalletContext();
  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData]);
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);
  const [isReferralCopied, setIsReferralCopied] = React.useState(false);

  return (
    <>
      <NextSeo title="marginfi — portfolio" />
      <PageHeader>portfolio</PageHeader>
      <div className="flex flex-col w-full h-full justify-start items-center px-4 gap-6 mb-20">
        <EmissionsBanner />
        {!connected ? (
          <PointsConnectWallet />
        ) : userPointsData ? (
          <MobilePointsOverview userPointsData={userPointsData} />
        ) : null}
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
