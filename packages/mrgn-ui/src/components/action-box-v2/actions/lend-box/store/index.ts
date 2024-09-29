import { StoreApi, UseBoundStore } from "zustand";

import { createLendBoxStore, LendBoxState } from "./lend-box-store";

const useLendBoxStore: UseBoundStore<StoreApi<LendBoxState>> = createLendBoxStore();

export { useLendBoxStore };
