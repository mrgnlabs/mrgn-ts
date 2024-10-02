import { StoreApi, UseBoundStore } from "zustand";

import { createRepayCollatBoxStore, RepayCollatBoxState } from "./loop-store";

export const useRepayCollatBoxStore: UseBoundStore<StoreApi<RepayCollatBoxState>> = createRepayCollatBoxStore();
