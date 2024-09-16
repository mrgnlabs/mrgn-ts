import { StoreApi, UseBoundStore } from "zustand";

import { createFlashLoanBoxStore, FlashLoanBoxState } from "./FlashLoanBoxStore";

export const useFlashLoanBoxStore: UseBoundStore<StoreApi<FlashLoanBoxState>> = createFlashLoanBoxStore();
