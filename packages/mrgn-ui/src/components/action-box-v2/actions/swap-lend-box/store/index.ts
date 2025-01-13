import { StoreApi, UseBoundStore } from "zustand";

import { createSwapLendBoxStore, SwapLendBoxState } from "./swap-lend-box-store";

const useSwapLendBoxGeneralStore: UseBoundStore<StoreApi<SwapLendBoxState>> = createSwapLendBoxStore();
const useSwapLendBoxDialogStore: UseBoundStore<StoreApi<SwapLendBoxState>> = createSwapLendBoxStore();

const useSwapLendBoxStore = (isDialog?: boolean): UseBoundStore<StoreApi<SwapLendBoxState>> => {
  if (!isDialog) {
    return useSwapLendBoxGeneralStore;
  } else {
    return useSwapLendBoxDialogStore;
  }
};

export { useSwapLendBoxStore };
