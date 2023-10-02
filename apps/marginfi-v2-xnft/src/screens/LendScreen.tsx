import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { useRecoilValue } from "recoil";
import tw from "~/styles/tailwind";
import { tabActiveAtom } from "~/consts";
import { Screen, Toggle } from "~/components/Common";
import { LendHeader, PoolCard, PoolCardSkeleton, TabSwitch } from "~/components/Lend";
import { useMrgnlendStore } from "~/store";
import config from "~/config";
import { useConnection } from "~/hooks/useConnection";
import { useWallet } from "~/hooks/useWallet";

export function LendScreen() {
  const { wallet } = useWallet();
  const connection = useConnection();
  const [marginfiClient, fetchMrgnlendState, selectedAccount, extendedBankInfos, nativeSolBalance] = useMrgnlendStore(
    (state) => [
      state.marginfiClient,
      state.fetchMrgnlendState,
      state.selectedAccount,
      state.extendedBankInfos,
      state.nativeSolBalance,
    ]
  );
  const tabActive = useRecoilValue(tabActiveAtom);
  const [isFiltered, setIsFiltered] = useState(false);
  const togglePositions = () => setIsFiltered((previousState) => !previousState);

  useEffect(() => {
    fetchMrgnlendState({ marginfiConfig: config.mfiConfig, connection, wallet }).catch(console.error);
    const id = setInterval(() => fetchMrgnlendState().catch(console.error), 30_000);
    return () => clearInterval(id);
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ crucial to omit both `connection` and `fetchMrgnlendState` from the dependency array
  // TODO: fix...

  const globalPools = useMemo(
    () =>
      extendedBankInfos &&
      extendedBankInfos
        .filter((b) => b.info.rawBank.config.assetWeightInit.toNumber() > 0)
        .filter((b) => (isFiltered ? b.isActive : true))
        .sort(
          (a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
        ),
    [extendedBankInfos, isFiltered]
  );

  const isolatedPools = useMemo(
    () =>
      extendedBankInfos
        .filter((b) => b.info.rawBank.config.assetWeightInit.toNumber() === 0)
        .filter((b) => (isFiltered ? b.isActive : true))
        .sort(
          (a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
        ),
    [extendedBankInfos, isFiltered]
  );

  return (
    <Screen>
      <View style={tw`px-12px pb-24px pt-16px`}>
        <View style={tw`flex flex-column gap-16px`}>
          <View style={tw`flex-row justify-between`}>
            <TabSwitch />
            <View style={tw`flex flex-row gap-3 items-center `}>
              <Toggle isEnabled={isFiltered} toggleSwitch={togglePositions} />
              <Text style={tw`text-base font-light text-primary`}>My positions</Text>
            </View>
          </View>
          <Text style={tw`text-xl text-primary pl-12px`}>Global pools</Text>
          <View style={tw`flex flex-row gap-2 flex-wrap`}>
            {extendedBankInfos.length > 0 ? (
              globalPools.length > 0 ? (
                globalPools.map((extendedBankInfo, idx) => (
                  <PoolCard
                    key={idx}
                    bankInfo={extendedBankInfo}
                    nativeSolBalance={nativeSolBalance}
                    isInLendingMode={tabActive === "lend"}
                    marginfiAccount={selectedAccount}
                    reloadBanks={async () => {
                      if (!connection) return;
                      fetchMrgnlendState({ marginfiConfig: config.mfiConfig, connection, wallet });
                    }}
                    marginfiClient={marginfiClient}
                  ></PoolCard>
                ))
              ) : (
                <Text style={tw`text-sm text-secondary pl-12px`}>No Global Pools Found</Text>
              )
            ) : (
              <PoolCardSkeleton />
            )}
          </View>

          <Text style={tw`text-xl text-primary pl-12px`}>Isolated pools</Text>
          <View style={tw`flex flex-row gap-2 flex-wrap`}>
            {extendedBankInfos.length > 0 ? (
              isolatedPools.length > 0 ? (
                isolatedPools.map((extendedBankInfo, idx) => (
                  <PoolCard
                    key={idx}
                    bankInfo={extendedBankInfo}
                    nativeSolBalance={nativeSolBalance}
                    isInLendingMode={tabActive === "lend"}
                    marginfiAccount={selectedAccount}
                    reloadBanks={async () => {
                      if (!connection) return;
                      fetchMrgnlendState({ marginfiConfig: config.mfiConfig, connection, wallet });
                    }}
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
      </View>
    </Screen>
  );
}
