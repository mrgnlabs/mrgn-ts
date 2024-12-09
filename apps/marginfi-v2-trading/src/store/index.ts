import {
  MrgnlendState,
  UserProfileState,
  createPersistentMrgnlendStore,
  createUserProfileStore,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { UseBoundStore, StoreApi } from "zustand";
import { UiState, createUiStore } from "./uiStore";
import { TradeStoreV2State } from "./tradeStoreV2";
import { createTradeStoreV2 } from "./tradeStoreV2";

const useUiStore: UseBoundStore<StoreApi<UiState>> = createUiStore();
const useMrgnlendStore: UseBoundStore<StoreApi<MrgnlendState>> = createPersistentMrgnlendStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();
const useTradeStoreV2: UseBoundStore<StoreApi<TradeStoreV2State>> = createTradeStoreV2();
export { useUiStore, useMrgnlendStore, useUserProfileStore, useTradeStoreV2 };
