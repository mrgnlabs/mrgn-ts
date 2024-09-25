import { StoreApi, UseBoundStore } from "zustand";

import { createLendBoxStore, LendBoxState } from "./LendBoxStore";

export const useLendBoxStore: UseBoundStore<StoreApi<LendBoxState>> = createLendBoxStore();
