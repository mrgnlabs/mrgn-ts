import {
  MrgnlendState,
  UserProfileState,
  createPersistentMrgnlendStore,
  createUserProfileStore,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { UseBoundStore, StoreApi } from "zustand";
import { UiState, createUiStore } from "./uiStore";
import { WalletState, createWalletStore } from "./walletStore";

const useUiStore: UseBoundStore<StoreApi<UiState>> = createUiStore();
const useWalletStore: UseBoundStore<StoreApi<WalletState>> = createWalletStore();
const useMrgnlendStore: UseBoundStore<StoreApi<MrgnlendState>> = createPersistentMrgnlendStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();

export { useUiStore, useMrgnlendStore, useUserProfileStore, useWalletStore };
