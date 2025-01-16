import { StoreApi, UseBoundStore } from "zustand";

import { createRepayBoxStore, RepayBoxState } from "./repay-store";

export const useRepayBoxStore: UseBoundStore<StoreApi<RepayBoxState>> = createRepayBoxStore();
