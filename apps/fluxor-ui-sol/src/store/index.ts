import { UseBoundStore, StoreApi } from "zustand";
import { AppState, createAppStore } from "./useAppStore";
// import { TokenStore, createTokenStore } from "./useTokenStore";
import { createUiStore } from "./uiStore";
import { UiState } from "./uiStore";
import { createPersistentMrgnlendStore } from "@mrgnlabs/marginfi-v2-ui-state";
import { MrgnlendState } from "@mrgnlabs/marginfi-v2-ui-state";
import { createUserProfileStore, UserProfileState } from "./userProfileStore";

// const useAppStore: UseBoundStore<StoreApi<AppState>> = createAppStore();
// const useTokenStore: UseBoundStore<StoreApi<TokenStore>> = createTokenStore();
const useUiStore: UseBoundStore<StoreApi<UiState>> = createUiStore();
const useMrgnlendStore: UseBoundStore<StoreApi<MrgnlendState>> = createPersistentMrgnlendStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();

export { useUiStore, useMrgnlendStore, useUserProfileStore };
