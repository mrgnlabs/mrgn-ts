import { StoreApi, UseBoundStore } from "zustand";

import { createLendBoxStore, LendBoxState } from "./lend-box-store";

export const useLendBoxStore: UseBoundStore<StoreApi<LendBoxState>> = createLendBoxStore();
