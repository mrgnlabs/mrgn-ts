import {
  MrgnlendState,
  UserProfileState,
  JupiterState,
  createMrgnlendStore,
  createUserProfileStore,
  createJupiterStore,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { UseBoundStore, StoreApi } from "zustand";

const useMrgnlendStore: UseBoundStore<StoreApi<MrgnlendState>> = createMrgnlendStore();
const useJupiterStore: UseBoundStore<StoreApi<JupiterState>> = createJupiterStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();

export { useMrgnlendStore, useJupiterStore, useUserProfileStore };
