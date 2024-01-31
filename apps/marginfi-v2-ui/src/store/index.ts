import {
  MrgnlendState,
  UserProfileState,
  createPersistentMrgnlendStore,
  createUserProfileStore,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { UseBoundStore, StoreApi } from "zustand";
import { UiState, createUiStore, SORT_OPTIONS_MAP } from "./uiStore";
import { LstState, createLstStore } from "./lstStore";

const useUiStore: UseBoundStore<StoreApi<UiState>> = createUiStore();
const useMrgnlendStore: UseBoundStore<StoreApi<MrgnlendState>> = createPersistentMrgnlendStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();
const useLstStore: UseBoundStore<StoreApi<LstState>> = createLstStore();

export { useUiStore, useMrgnlendStore, useLstStore, useUserProfileStore, SORT_OPTIONS_MAP };
