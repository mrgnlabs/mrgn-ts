import {
  MrgnlendState,
  UserProfileState,
  createPersistentMrgnlendStore,
  createUserProfileStore,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { UseBoundStore, StoreApi } from "zustand";
import { UiState, createUiStore } from "./uiStore";
import { TradeStoreState, createTradeStore } from "./tradeStore";

const useUiStore: UseBoundStore<StoreApi<UiState>> = createUiStore();
const useMrgnlendStore: UseBoundStore<StoreApi<MrgnlendState>> = createPersistentMrgnlendStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();
const useTradeStore: UseBoundStore<StoreApi<TradeStoreState>> = createTradeStore();

export {
  useUiStore,
  useMrgnlendStore,
  useUserProfileStore,
  useTradeStore,
};
