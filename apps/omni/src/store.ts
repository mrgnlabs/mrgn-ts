import { MrgnlendState, createMrgnlendStore } from "@mrgnlabs/marginfi-v2-ui-state";
import { UseBoundStore, StoreApi } from "zustand";

const useMrgnlendStore: UseBoundStore<StoreApi<MrgnlendState>> = createMrgnlendStore();

export { useMrgnlendStore };
