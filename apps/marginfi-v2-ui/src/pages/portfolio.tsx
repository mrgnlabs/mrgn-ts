import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import { useConnection } from "@solana/wallet-adapter-react";

import { useMrgnlendStore, useUserProfileStore } from "~/store";
import config from "~/config/marginfi";
import { useWalletContext } from "~/hooks/useWalletContext";
import { PageHeader } from "~/components/common/PageHeader";
import { MobileAccountSummary } from "~/components/mobile/MobileAccountSummary";
import { MobilePortfolioOverview } from "~/components/mobile/MobilePortfolioOverview";
import {
  PointsOverview,
  PointsSignIn,
  PointsSignUp,
  PointsCheckingUser,
  PointsConnectWallet,
} from "~/components/desktop/Points";
import { AssetCard } from "~/components/mobile/MobileAssetsList/AssetCard";
import { Button, Skeleton, Typography } from "@mui/material";
import { EmissionsBanner } from "~/components/mobile/EmissionsBanner";

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

  const referralCode = useMemo(() => routerQuery.referralCode as string | undefined, [routerQuery.referralCode]);

  const lendingBanks = useMemo(
    () =>
      sortedBanks && isStoreInitialized
        ? sortedBanks
            .filter((b) => b.info.rawBank.config.assetWeightInit.toNumber() > 0)
            .filter((b) => b.isActive && b.position.isLending)
            .sort(
              (a, b) =>
                b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
            )
        : [],
    [sortedBanks, isStoreInitialized]
  );

  const borrowingBanks = useMemo(
    () =>
      sortedBanks && isStoreInitialized
        ? sortedBanks
            .filter((b) => b.info.rawBank.config.assetWeightInit.toNumber() > 0)
            .filter((b) => b.isActive && !b.position.isLending)
            .sort(
              (a, b) =>
                b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
            )
        : [],
    [sortedBanks, isStoreInitialized]
  );

  useEffect(() => {
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
      <div className="flex flex-col w-full h-full justify-start items-center px-[12px] gap-6 mb-20">
        <MobileAccountSummary />
        <EmissionsBanner />
        <MobilePortfolioOverview />
        {!connected ? (
          null
        ) : currentFirebaseUser ? (
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
        <div className="text-center text-[#868E95] text-xs flex justify-center gap-1">
          <div>We reserve the right to update point calculations at any time.</div>
          <div>
            <Link href="/terms/points" style={{ textDecoration: "underline" }}>
              Terms.
            </Link>
          </div>
        </div>
        {sortedBanks && (
          <div className="col-span-full w-full max-w-[900px]">
            <div className="font-aeonik font-normal flex items-center text-2xl text-white pb-2">Lending positions</div>

            {isStoreInitialized ? (
              lendingBanks.length > 0 ? (
                <div className="flex flew-row flex-wrap gap-4 justify-center items-center">
                  {lendingBanks.map((bank) => (
                    <AssetCard
                      key={bank.meta.tokenSymbol}
                      nativeSolBalance={nativeSolBalance}
                      bank={bank}
                      isInLendingMode={false}
                      isConnected={connected}
                      marginfiAccount={selectedAccount}
                    />
                  ))}
                </div>
              ) : (
                <Typography color="#868E95" className="font-aeonik font-[300] text-sm flex gap-1" gutterBottom>
                  No lending positions found.
                </Typography>
              )
            ) : (
              <Skeleton sx={{ bgcolor: "grey.900" }} variant="rounded" width={390} height={215} />
            )}
          </div>
        )}

        {sortedBanks && (
          <div className="col-span-full w-full max-w-[900px]">
            <div className="font-aeonik font-normal flex items-center text-2xl text-white pb-2">
              Borrowing positions
            </div>

            {isStoreInitialized ? (
              borrowingBanks.length > 0 ? (
                <div className="flex flew-row flex-wrap gap-4 justify-center items-center">
                  {borrowingBanks.map((bank) => (
                    <AssetCard
                      key={bank.meta.tokenSymbol}
                      nativeSolBalance={nativeSolBalance}
                      bank={bank}
                      isInLendingMode={false}
                      isConnected={connected}
                      marginfiAccount={selectedAccount}
                    />
                  ))}
                </div>
              ) : (
                <Typography color="#868E95" className="font-aeonik font-[300] text-sm flex gap-1 pb-5" gutterBottom>
                  No borrowing positions found.
                </Typography>
              )
            ) : (
              <Skeleton sx={{ bgcolor: "grey.900" }} variant="rounded" width={390} height={215} />
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default PortfolioPage;
