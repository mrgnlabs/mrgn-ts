import React, { useMemo, FC, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import { useRouter } from "next/router";

import { LeaderboardRow, fetchLeaderboardData } from "@mrgnlabs/marginfi-v2-ui-state";

import { useUserProfileStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { PageHeader } from "~/components/desktop/PageHeader";
import {
  PointsLeaderBoard,
  PointsOverview,
  PointsSignIn,
  PointsSignUp,
  PointsCheckingUser,
  PointsConnectWallet,
} from "~/components/desktop/Points";

const Points: FC = () => {
  const { connected, walletAddress } = useWalletContext();
  const { query: routerQuery } = useRouter();
  const [currentFirebaseUser, hasUser, userPointsData] = useUserProfileStore((state) => [
    state.currentFirebaseUser,
    state.hasUser,
    state.userPointsData,
  ]);

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardRow[]>([]);

  const currentUserId = useMemo(() => currentFirebaseUser?.uid, [currentFirebaseUser]);
  const referralCode = useMemo(() => routerQuery.referralCode as string | undefined, [routerQuery.referralCode]);

  useEffect(() => {
    fetchLeaderboardData().then(setLeaderboardData); // TODO: cache leaderboard and avoid call
  }, [connected, walletAddress]); // Dependency array to re-fetch when these variables change

  return (
    <>
      <PageHeader text="points" />
      <div className="flex flex-col items-center w-full sm:w-4/5 max-w-7xl gap-5 py-[64px] sm:py-[32px]">
        {!connected ? (
          <PointsConnectWallet />
        ) : currentFirebaseUser ? (
          <PointsOverview userPointsData={userPointsData} />
        ) : hasUser === null ? (
          <PointsCheckingUser />
        ) : hasUser ? (
          <PointsSignIn />
        ) : (
          <PointsSignUp referralCode={referralCode} />
        )}
        <div className="w-2/3 flex justify-center items-center gap-5">
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
          {currentFirebaseUser && (
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
              onClick={() => {
                if (userPointsData.referralLink) {
                  navigator.clipboard.writeText(userPointsData.referralLink);
                }
              }}
            >
              {`${
                userPointsData.isCustomReferralLink
                  ? userPointsData.referralLink?.replace("https://", "")
                  : "Copy referral link"
              }`}
              <FileCopyIcon />
            </Button>
          )}
        </div>
        <div className="w-4/5 text-center text-[#868E95] text-xs flex justify-center gap-1">
          <div>We reserve the right to update point calculations at any time.</div>
          <div>
            <Link href="/terms/points" style={{ textDecoration: "underline" }}>
              Terms.
            </Link>
          </div>
        </div>
        <PointsLeaderBoard leaderboardData={leaderboardData} currentUserId={currentUserId} />
      </div>
    </>
  );
};

export default Points;
