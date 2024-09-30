import { StoreApi, UseBoundStore } from "zustand";

import { createRepayCollatBoxStore, RepayCollatBoxState } from "./repay-collat-store";

export const useRepayCollatBoxStore: UseBoundStore<StoreApi<RepayCollatBoxState>> = createRepayCollatBoxStore();
