import {
  MrgnlendState,
  UserProfileState,
  createMrgnlendStore,
  createUserProfileStore,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { UseBoundStore, StoreApi } from "zustand";

const useMrgnlendStore: UseBoundStore<StoreApi<MrgnlendState>> = createMrgnlendStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();

export { useMrgnlendStore, useUserProfileStore };
