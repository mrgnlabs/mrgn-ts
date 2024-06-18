import {
  MrgnlendState,
  UserProfileState,
  createPersistentMrgnlendStore,
  createUserProfileStore,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { UseBoundStore, StoreApi } from "zustand";
import { UiState, createUiStore, SORT_OPTIONS_MAP } from "./uiStore";
import { LstState, createLstStore } from "./lstStore";
import { ActionBoxState, createActionBoxStore } from "./actionBoxStore";
import { TradeStoreState, createTradeStore } from "./tradeStore";

const useUiStore: UseBoundStore<StoreApi<UiState>> = createUiStore();
const useMrgnlendStore: UseBoundStore<StoreApi<MrgnlendState>> = createPersistentMrgnlendStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();
const useLstStore: UseBoundStore<StoreApi<LstState>> = createLstStore();
const useActionBoxGeneralStore: UseBoundStore<StoreApi<ActionBoxState>> = createActionBoxStore();
const useActionBoxDialogStore: UseBoundStore<StoreApi<ActionBoxState>> = createActionBoxStore();
const useTradeStore: UseBoundStore<StoreApi<TradeStoreState>> = createTradeStore();

export {
  useUiStore,
  useMrgnlendStore,
  useLstStore,
  useActionBoxGeneralStore,
  useActionBoxDialogStore,
  useUserProfileStore,
  useTradeStore,
  SORT_OPTIONS_MAP,
  createActionBoxStore,
};
export type { ActionBoxState };
