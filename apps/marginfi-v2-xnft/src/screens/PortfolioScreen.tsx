import React, { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import tw from "~/styles/tailwind";
import { Screen } from "~/components/Common";
import { PortfolioOverview, PortfolioHeader } from "~/components/Portfolio";
import { PoolCard, PoolCardSkeleton } from "~/components/Lend";
import { useMrgnlendStore, useUserProfileStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWallet } from "~/hooks/useWallet";
import config from "~/config";

export function PortfolioScreens() {
  const { wallet } = useWallet();
  const connection = useConnection();
  const [
    marginfiClient,
    fetchBankMetadatas,
    fetchMrgnlendState,
    selectedAccount,
    accountSummary,
    extendedBankInfos,
    nativeSolBalance,
    protocolStats,
  ] = useMrgnlendStore((state) => [
    state.marginfiClient,
    state.fetchBankMetadatas,
    state.fetchMrgnlendState,
    state.selectedAccount,
    state.accountSummary,
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.protocolStats,
  ]);

  const [userPointsData, currentFirebaseUser] = useUserProfileStore((state) => [
    state.userPointsData,
    state.currentFirebaseUser,
  ]);

  useEffect(() => {
    if (!wallet || !connection) return;
    fetchBankMetadatas().catch(console.error);
    fetchMrgnlendState({ marginfiConfig: config.mfiConfig, connection, wallet }).catch(console.error);
    const id = setInterval(() => fetchMrgnlendState().catch(console.error), 30_000);
    return () => clearInterval(id);
  }, [wallet, connection, fetchBankMetadatas, fetchMrgnlendState]);

  const lendingPools = useMemo(
    () =>
      extendedBankInfos &&
      extendedBankInfos
        .filter((b) => b.info.rawBank.config.assetWeightInit.toNumber() > 0)
        .filter((b) => b.isActive && b.position.isLending)
        .sort((a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price),
    [extendedBankInfos]
  );

  const borrowingPools = useMemo(
    () =>
      extendedBankInfos &&
      extendedBankInfos
        .filter((b) => b.info.rawBank.config.assetWeightInit.toNumber() > 0)
        .filter((b) => b.isActive && !b.position.isLending)
        .sort((a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price),
    [extendedBankInfos]
  );

  return (
    <Screen>
      <PortfolioHeader
        globalDeposits={protocolStats.deposits}
        globalBorrowed={protocolStats.borrows}
        globalPoints={protocolStats.pointsTotal}
      />
      <View style={tw`px-12px pb-24px`}>
        <View style={tw`flex flex-column gap-16px`}>
          <PortfolioOverview
            isFirebaseConnected={!!currentFirebaseUser}
            points={userPointsData}
            selectedAccount={selectedAccount ?? undefined}
            accountSummary={accountSummary}
          />

          <Text style={tw`text-xl text-primary pl-12px`}>Lending positions</Text>
          {extendedBankInfos.length > 0 ? (
            lendingPools.length > 0 ? (
              lendingPools.map((extendedBankInfo, idx) => (
                <PoolCard
                  key={idx}
                  bankInfo={extendedBankInfo}
                  nativeSolBalance={nativeSolBalance}
                  isInLendingMode={false}
                  marginfiAccount={selectedAccount}
                  reloadBanks={fetchMrgnlendState}
                  marginfiClient={marginfiClient}
                />
              ))
            ) : (
              <Text style={tw`text-sm text-secondary pl-12px`}>No Lending Positions Found</Text>
            )
          ) : (
            <PoolCardSkeleton />
          )}
          <Text style={tw`text-xl text-primary pl-12px`}>Borrowing positions</Text>
          {extendedBankInfos.length > 0 ? (
            borrowingPools.length > 0 ? (
              borrowingPools.map((extendedBankInfo, idx) => (
                <PoolCard
                  key={idx}
                  bankInfo={extendedBankInfo}
                  nativeSolBalance={nativeSolBalance}
                  isInLendingMode={true}
                  marginfiAccount={selectedAccount}
                  reloadBanks={fetchMrgnlendState}
                  marginfiClient={marginfiClient}
                />
              ))
            ) : (
              <Text style={tw`text-sm text-secondary pl-12px`}>No Borrowing Positions Found</Text>
            )
          ) : (
            <PoolCardSkeleton />
          )}
        </View>
      </View>
    </Screen>
  );
}
