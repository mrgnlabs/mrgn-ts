import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Modal, StyleSheet } from "react-native";

import tw from "~/styles/tailwind";

import { Screen } from "~/components/Common";
import {
  SwapForm,
  PriceInfo,
  SetSlippage,
  FormPairSelector,
  ReviewOrderModal,
  ConfirmOrderModal,
} from "~/components/JupiterUi";
import { TokenInfo } from "@solana/spl-token-registry/dist/main/lib/tokenlist";
import { IForm, useSwapContext } from "~/context";
import { WSOL_MINT } from "~/config";
import { PublicKey } from "@solana/web3.js";
import { useJupiterStore, useLstStore, useMrgnlendStore } from "~/store/store";
import { useConnection } from "~/hooks/useConnection";
import { useWallet } from "~/hooks/useWallet";
import { StakingStats } from "~/components/Staking";
import { StakingCard } from "~/components/Staking/StakingCard";

export function StakeScreen() {
  const { wallet } = useWallet();
  const connection = useConnection();
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
    fetchLstState({ connection, wallet }).catch(console.error);
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
      <View>
        <StakingStats
          isLoading={initialized || isRefreshingStore}
          tvl={lstData?.tvl}
          solUsdValue={solUsdValue ?? undefined}
          projectedApy={lstData?.projectedApy}
        />
        <StakingCard />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({});
