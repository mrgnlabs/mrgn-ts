import React, { useEffect, useMemo } from "react";
import { Text, View } from "react-native";

import { useMrgnlendStore, useUserProfileStore } from "~/store/store";
import { useWallet } from "~/context/WalletContext";
import { useConnection } from "~/context/ConnectionContext";
import tw from "~/styles/tailwind";
import config from "~/config";
import { PUBLIC_BIRDEYE_API_KEY } from "@env";

import { Screen } from "~/components/Common";
import { PortfolioOverview, PortfolioHeader } from "~/components/Portfolio";
import { PoolCard, PoolCardSkeleton } from "~/components/Lend";

export function PortfolioScreen() {
  const { wallet } = useWallet();
  const { connection } = useConnection();
  const [
    marginfiClient,
    fetchMrgnlendState,
    selectedAccount,
    accountSummary,
    extendedBankInfos,
    nativeSolBalance,
    protocolStats,
  ] = useMrgnlendStore((state) => [
    state.marginfiClient,
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

  const lendingPools = useMemo(
    () =>
      extendedBankInfos &&
      extendedBankInfos
        .filter((b) => b.info.rawBank.config.assetWeightInit.toNumber() > 0)
        .filter((b) => b.isActive && b.position.isLending)
        .sort(
          (a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
        ),
    [extendedBankInfos]
  );

  const borrowingPools = useMemo(
    () =>
      extendedBankInfos &&
      extendedBankInfos
        .filter((b) => b.info.rawBank.config.assetWeightInit.toNumber() > 0)
        .filter((b) => b.isActive && !b.position.isLending)
        .sort(
          (a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
        ),
    [extendedBankInfos]
  );

  return (
    <Screen>
      <PortfolioHeader
        globalDeposits={protocolStats.deposits}
        globalBorrowed={protocolStats.borrows}
        tvl={protocolStats.tvl}
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
              <View style={tw`flex flew-row flex-wrap gap-6 justify-center items-center `}>
                {lendingPools.map((extendedBankInfo, idx) => (
                  <PoolCard
                    key={idx}
                    bankInfo={extendedBankInfo}
                    nativeSolBalance={nativeSolBalance}
                    isInLendingMode={false}
                    marginfiAccount={selectedAccount}
                    reloadBanks={async () => {
                      if (!connection) return;
                      fetchMrgnlendState({
                        marginfiConfig: config.mfiConfig,
                        connection,
                        wallet: wallet ?? undefined,
                        birdEyeApiKey: PUBLIC_BIRDEYE_API_KEY,
                      });
                    }}
                    marginfiClient={marginfiClient}
                  />
                ))}
              </View>
            ) : (
              <Text style={tw`text-sm text-secondary pl-12px`}>No Lending Positions Found</Text>
            )
          ) : (
            <PoolCardSkeleton />
          )}
          <Text style={tw`text-xl text-primary pl-12px`}>Borrowing positions</Text>
          {extendedBankInfos.length > 0 ? (
            borrowingPools.length > 0 ? (
              <View style={tw`flex flew-row flex-wrap gap-6 justify-center items-center`}>
                {borrowingPools.map((extendedBankInfo, idx) => (
                  <PoolCard
                    key={idx}
                    bankInfo={extendedBankInfo}
                    nativeSolBalance={nativeSolBalance}
                    isInLendingMode={true}
                    marginfiAccount={selectedAccount}
                    reloadBanks={async () => {
                      if (!connection) return;
                      fetchMrgnlendState({
                        marginfiConfig: config.mfiConfig,
                        connection,
                        wallet: wallet ?? undefined,
                        birdEyeApiKey: PUBLIC_BIRDEYE_API_KEY,
                      });
                    }}
                    marginfiClient={marginfiClient}
                  />
                ))}
              </View>
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
