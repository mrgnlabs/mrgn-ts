import { UserProfileState, createUserProfileStore } from "./userProfileStore";
import { UseBoundStore, StoreApi } from "zustand";
import { UiState, createUiStore } from "./uiStore";
import { TradeStoreV2State } from "./tradeStoreV2";
import { createTradeStoreV2 } from "./tradeStoreV2";

const useUiStore: UseBoundStore<StoreApi<UiState>> = createUiStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();
const useTradeStoreV2: UseBoundStore<StoreApi<TradeStoreV2State>> = createTradeStoreV2();
export { useUiStore, useUserProfileStore, useTradeStoreV2 };
