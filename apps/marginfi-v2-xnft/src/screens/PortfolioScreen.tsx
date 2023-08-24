import React, { useMemo } from "react";
import { Text, View } from "react-native";
import tw from "~/styles/tailwind";
import { Screen } from "~/components/Common";
import { PortfolioOverview, PortfolioHeader } from "~/components/Portfolio";
import { PoolCard, PoolCardSkeleton } from "~/components/Lend";
import { useMrgnlendStore, useUserProfileStore } from "~/store";

export function PortfolioScreens() {
  const [
    marginfiClient,
    reloadMrgnlendState,
    selectedAccount,
    accountSummary,
    extendedBankInfos,
    nativeSolBalance,
    protocolStats,
  ] = useMrgnlendStore((state) => [
    state.marginfiClient,
    state.reloadMrgnlendState,
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

  const lendingPools = useMemo(
    () =>
      extendedBankInfos &&
      extendedBankInfos
        .filter((b) => b.bank.config.assetWeightInit.toNumber() > 0)
        .filter((b) => b.hasActivePosition && b.position.isLending)
        .sort((a, b) => b.totalPoolDeposits * b.tokenPrice - a.totalPoolDeposits * a.tokenPrice),
    [extendedBankInfos]
  );

  const borrowingPools = useMemo(
    () =>
      extendedBankInfos &&
      extendedBankInfos
        .filter((b) => b.bank.config.assetWeightInit.toNumber() > 0)
        .filter((b) => b.hasActivePosition && !b.position.isLending)
        .sort((a, b) => b.totalPoolDeposits * b.tokenPrice - a.totalPoolDeposits * a.tokenPrice),
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
                  reloadBanks={reloadMrgnlendState}
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
                  reloadBanks={reloadMrgnlendState}
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
