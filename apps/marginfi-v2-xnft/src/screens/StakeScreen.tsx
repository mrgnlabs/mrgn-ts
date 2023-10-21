import React, { useEffect } from "react";
import { View, Text } from "react-native";

import { useLstStore } from "~/store/store";
import { useWallet } from "~/context/WalletContext";
import { useConnection } from "~/context/ConnectionContext";

import tw from "~/styles/tailwind";

import { Screen } from "~/components/Common";
import { StakingStats, StakingCard } from "~/components/Staking";

export function StakeScreen() {
  const { wallet } = useWallet();
  const { connection } = useConnection();
  const [
    initialized,
    isRefreshingStore,
    fetchLstState,
    setIsRefreshingStore,
    userDataFetched,
    resetUserData,
    lstData,
    solUsdValue,
  ] = useLstStore((state) => [
    state.initialized,
    state.isRefreshingStore,
    state.fetchLstState,
    state.setIsRefreshingStore,
    state.userDataFetched,
    state.resetUserData,
    state.lstData,
    state.solUsdValue,
  ]);

  useEffect(() => {
    setIsRefreshingStore(true);
    fetchLstState({ connection, wallet: wallet ?? undefined }).catch(console.error);
    const id = setInterval(() => {
      setIsRefreshingStore(true);
      fetchLstState().catch(console.error);
    }, 30_000);
    return () => clearInterval(id);
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ crucial to omit both `connection` and `fetchMrgnlendState` from the dependency array
  // TODO: fix...

  return (
    <Screen>
      <View style={tw`px-12px pb-24px pt-1 flex gap-3`}>
        <StakingStats
          isLoading={initialized || isRefreshingStore}
          tvl={lstData?.tvl}
          solUsdValue={solUsdValue ?? undefined}
          projectedApy={lstData?.projectedApy}
        />
        <StakingCard />

        <View style={tw`flex flex-col mt-10 pb-4 gap-5 justify-center font-aeonik`}>
          <Text style={tw`text-center w-full text-xl font-[200] text-primary`}>
            <Text style={tw`font-bold text-[#DCE85D]`}>$LST</Text>, by mrgn
          </Text>
          <Text style={tw`text-center w-full text-xl font-[200] text-primary`}>
            Introducing the best way to get exposure to SOL. <Text style={tw`font-bold text-[#DCE85D]`}>$LST</Text> is
            built on mrgn&apos;s validator network and Jito&apos;s MEV rewards. For the first time,{" "}
            <Text style={tw`font-bold text-[#DCE85D]`}>$LST</Text> holders can get the best staking yield available on
            Solana, combined with the biggest MEV rewards from Solana&apos;s trader network.
          </Text>
          <Text style={tw`text-center w-full text-xl font-[200] text-primary`}>
            <Text style={tw`font-bold text-[#DCE85D]`}>$LST</Text> has 0% commission. The yield goes to you. Stop paying
            middlemen. Stop using underperforming validators. Stop missing out on MEV rewards.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
