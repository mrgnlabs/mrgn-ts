import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { useRecoilValue } from "recoil";
import tw from "~/styles/tailwind";
import { tabActiveAtom } from "~/consts";
import { Screen, Toggle } from "~/components/Common";
import { LendHeader, PoolCard, PoolCardSkeleton, TabSwitch } from "~/components/Lend";
import { useMrgnlendStore } from "~/store";

export function LendScreen() {
  const [marginfiClient, reloadMrgnlendState, selectedAccount, accountSummary, extendedBankInfos, nativeSolBalance] =
    useMrgnlendStore((state) => [
      state.marginfiClient,
      state.reloadMrgnlendState,
      state.selectedAccount,
      state.accountSummary,
      state.extendedBankInfos,
      state.nativeSolBalance,
    ]);
  const tabActive = useRecoilValue(tabActiveAtom);
  const [isFiltered, setIsFiltered] = useState(false);
  const togglePositions = () => setIsFiltered((previousState) => !previousState);

  const globalPools = useMemo(
    () =>
      extendedBankInfos &&
      extendedBankInfos
        .filter((b) => b.bank.config.assetWeightInit.toNumber() > 0)
        .filter((b) => (isFiltered ? b.hasActivePosition : true))
        .sort((a, b) => b.totalPoolDeposits * b.tokenPrice - a.totalPoolDeposits * a.tokenPrice),
    [extendedBankInfos, isFiltered]
  );

  const isolatedPools = useMemo(
    () =>
      extendedBankInfos
        .filter((b) => b.bank.config.assetWeightInit.toNumber() === 0)
        .filter((b) => (isFiltered ? b.hasActivePosition : true))
        .sort((a, b) => b.totalPoolDeposits * b.tokenPrice - a.totalPoolDeposits * a.tokenPrice),
    [extendedBankInfos, isFiltered]
  );

  return (
    <Screen>
      <LendHeader accountSummary={accountSummary} />
      <View style={tw`px-12px pb-24px`}>
        <View style={tw`flex flex-column gap-16px`}>
          <TabSwitch />
          <View style={tw`flex flex-row gap-6px`}>
            <Toggle isEnabled={isFiltered} toggleSwitch={togglePositions} />
            <Text style={tw`text-base text-primary`}>Filter my positions</Text>
          </View>
          <Text style={tw`text-xl text-primary pl-12px`}>Global pools</Text>
          {extendedBankInfos.length > 0 ? (
            globalPools.length > 0 ? (
              globalPools.map((extendedBankInfo, idx) => (
                <PoolCard
                  key={idx}
                  bankInfo={extendedBankInfo}
                  nativeSolBalance={nativeSolBalance}
                  isInLendingMode={tabActive === "lend"}
                  marginfiAccount={selectedAccount}
                  reloadBanks={reloadMrgnlendState}
                  marginfiClient={marginfiClient}
                ></PoolCard>
              ))
            ) : (
              <Text style={tw`text-sm text-secondary pl-12px`}>No Global Pools Found</Text>
            )
          ) : (
            <PoolCardSkeleton />
          )}

          <Text style={tw`text-xl text-primary pl-12px`}>Isolated pools</Text>
          {extendedBankInfos.length > 0 ? (
            isolatedPools.length > 0 ? (
              isolatedPools.map((extendedBankInfo, idx) => (
                <PoolCard
                  key={idx}
                  bankInfo={extendedBankInfo}
                  nativeSolBalance={nativeSolBalance}
                  isInLendingMode={tabActive === "lend"}
                  marginfiAccount={selectedAccount}
                  reloadBanks={reloadMrgnlendState}
                  marginfiClient={marginfiClient}
                ></PoolCard>
              ))
            ) : (
              <Text style={tw`text-sm text-secondary pl-12px`}>No Isolated Pools Found</Text>
            )
          ) : (
            <PoolCardSkeleton />
          )}
        </View>
      </View>
    </Screen>
  );
}
