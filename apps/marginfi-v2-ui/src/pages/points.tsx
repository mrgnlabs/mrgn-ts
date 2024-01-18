import React from "react";

import Link from "next/link";

import { NextSeo } from "next-seo";
import { CopyToClipboard } from "react-copy-to-clipboard";

import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { PageHeader } from "~/components/common/PageHeader";
import { PointsOverview, PointsConnectWallet, PointsTable } from "~/components/desktop/Points";
import { Button } from "~/components/ui/button";
import { IconCopy, IconCheck } from "~/components/ui/icons";
import { Loader } from "~/components/ui/loader";

export default function PointsPage() {
  const { connected } = useWalletContext();

  const [initialized] = useMrgnlendStore((state) => [state.initialized]);

  const [currentFirebaseUser, userPointsData] = useUserProfileStore((state) => [
    state.currentFirebaseUser,
    state.userPointsData,
  ]);
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);

  const [isReferralCopied, setIsReferralCopied] = React.useState(false);

  return (
    <>
      <NextSeo title="marginfi — points" />
      <PageHeader>points</PageHeader>
      {!initialized && <Loader label="Loading marginfi points..." className="mt-16" />}

      {initialized && (
        <div className="flex flex-col items-center w-full max-w-8xl px-10 gap-5 py-[64px] sm:py-[32px]">
          {!connected ? <PointsConnectWallet /> : <PointsOverview userPointsData={userPointsData} />}
          <div className="w-2/3 flex flex-wrap justify-center items-center gap-5">
            <Link
              href="https://medium.com/marginfi/introducing-mrgn-points-949e18f31a8c"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="rounded-full text-lg h-auto py-3 min-w-[232px]">
                How do points work?
              </Button>
            </Link>

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
              <Button size="lg" className="rounded-full text-lg h-auto py-3 min-w-[232px]">
                {isReferralCopied
                  ? "Link copied"
                  : `${
                      userPointsData.isCustomReferralLink
                        ? userPointsData.referralLink?.replace("https://", "")
                        : "Copy referral link"
                    }`}
                {isReferralCopied ? <IconCheck size={22} /> : <IconCopy size={22} />}
              </Button>
            </CopyToClipboard>
          </div>
          <div className="text-muted-foreground text-xs">
            <p>
              We reserve the right to update point calculations at any time.{" "}
              <Link
                href="/terms/points"
                className="border-b border-muted-foreground/40 transition-colors hover:border-transparent"
              >
                Terms.
              </Link>
            </p>
          </div>
          <PointsTable userPointsData={userPointsData} />
        </div>
      )}
    </>
  );
}
