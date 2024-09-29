import { StoreApi, UseBoundStore } from "zustand";

import { createRepayCollatBoxStore, RepayCollatBoxState } from "./repayCollatStore";

export const useRepayCollatBoxStore: UseBoundStore<StoreApi<RepayCollatBoxState>> = createRepayCollatBoxStore();
