import React from "react";

import Link from "next/link";
import { CopyToClipboard } from "react-copy-to-clipboard";

import { numeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { UserPointsData } from "@mrgnlabs/marginfi-v2-ui-state";
import { useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { IconInfoCircleFilled, IconCopy, IconCheck, IconBackpackWallet } from "~/components/ui/icons";

interface PointsOverviewProps {
  userPointsData: UserPointsData;
}

export const PointsOverview = ({ userPointsData }: PointsOverviewProps) => {
  const { wallet } = useWalletContext();
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);
  const [isReferralCopied, setIsReferralCopied] = React.useState(false);
  const [mostUsedWallet, setMostUsedWallet] = React.useState<string>("");

  React.useEffect(() => {
    if (!wallet) return;
    const getMostUsedWallet = async (wallet: string) => {
      const response = await fetch(`/api/user/wallet?wallet=${wallet}`);
      const data = await response.json();
      if (data.wallet) setMostUsedWallet(data.wallet);
    };

    getMostUsedWallet(wallet.publicKey.toBase58());
  }, [wallet]);

  return (
    <>
      <div className="max-w-[800px] w-full mx-auto mt-4">
        <div className="grid grid-cols-2 gap-3 md:gap-5 mb-3 md:mb-5">
          <div className="bg-background-gray-dark rounded-lg py-3.5 px-4">
            <h2 className="text-sm md:text-base flex gap-1.5 text-muted-foreground/80">
              Total Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled size={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Points refresh every 24 hours.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </h2>
            <h3 className="text-white font-[500] text-2xl md:text-3xl mt-1.5">
              {userPointsData && numeralFormatter(userPointsData.totalPoints)}
            </h3>
            {mostUsedWallet === "Bacpack" && (
              <p className="flex items-center gap-1.5 rounded-lg w-full max-w-fit text-xs font-mono mt-3 text-muted-foreground">
                <IconBackpackWallet size={16} /> 1.2x points boost active2
              </p>
            )}
          </div>
          <div className="bg-background-gray-dark rounded-lg py-3.5 px-4">
            <h2 className="text-base flex gap-1.5 text-muted-foreground/80">
              Global Rank {/* TODO: fix that with dedicated query */}
            </h2>
            <h3 className="text-white font-[500] text-2xl md:text-3xl mt-1.5">
              {userPointsData &&
                (userPointsData.userRank ? `#${groupedNumberFormatterDyn.format(userPointsData.userRank)}` : "-")}
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5">
          <div className="bg-background-gray-dark h-24 rounded-lg py-3.5 px-4">
            <h2 className="text-sm md:text-base flex gap-1.5 text-muted-foreground/80">
              Lending Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled size={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Lending earns 1 point per dollar lent per day.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </h2>
            <h3 className="text-white font-[500] text-2xl mt-1.5">
              {userPointsData && numeralFormatter(userPointsData.depositPoints)}
            </h3>
          </div>
          <div className="bg-background-gray-dark h-24 rounded-lg py-3.5 px-4">
            <h2 className="text-sm md:text-base flex gap-1.5 text-muted-foreground/80">
              Borrowing Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled size={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Borrowing earns 4 points per dollar borrowed per day.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </h2>
            <h3 className="text-white font-[500] text-2xl mt-1.5">
              {userPointsData && numeralFormatter(userPointsData.borrowPoints)}
            </h3>
          </div>
          <div className="bg-background-gray-dark h-24 rounded-lg py-3.5 px-4 col-span-2 md:col-span-1">
            <h2 className="text-sm md:text-base flex gap-1.5 text-muted-foreground/80">
              Referral Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled size={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Earn 10% of the points any user you refer earns.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </h2>
            <h3 className="text-white font-[500] text-2xl mt-1.5">
              {userPointsData && numeralFormatter(userPointsData.referralPoints)}
            </h3>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-3 md:gap-5">
        <Link
          href="https://medium.com/marginfi/introducing-mrgn-points-949e18f31a8c"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="lg" className="rounded-full md:text-lg h-auto py-2 md:py-3 min-w-[232px]">
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
          <Button size="lg" className="rounded-full md:text-lg h-auto py-2 md:py-3 min-w-[232px]">
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
    </>
  );
};
