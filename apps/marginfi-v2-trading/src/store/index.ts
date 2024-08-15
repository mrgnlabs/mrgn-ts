import {
  MrgnlendState,
  UserProfileState,
  createPersistentMrgnlendStore,
  createUserProfileStore,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { UseBoundStore, StoreApi } from "zustand";
import { UiState, createUiStore } from "./uiStore";
import { ActionBoxState, createActionBoxStore } from "./actionBoxStore";
import { TradeStoreState, createTradeStore } from "./tradeStore";

const useUiStore: UseBoundStore<StoreApi<UiState>> = createUiStore();
const useMrgnlendStore: UseBoundStore<StoreApi<MrgnlendState>> = createPersistentMrgnlendStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();
const useActionBoxGeneralStore: UseBoundStore<StoreApi<ActionBoxState>> = createActionBoxStore();
const useActionBoxDialogStore: UseBoundStore<StoreApi<ActionBoxState>> = createActionBoxStore();
const useTradeStore: UseBoundStore<StoreApi<TradeStoreState>> = createTradeStore();

export {
  useUiStore,
  useMrgnlendStore,
  useActionBoxGeneralStore,
  useActionBoxDialogStore,
  useUserProfileStore,
  useTradeStore,
  createActionBoxStore,
};
export type { ActionBoxState };
