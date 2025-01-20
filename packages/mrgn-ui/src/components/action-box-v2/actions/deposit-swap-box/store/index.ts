import { StoreApi, UseBoundStore } from "zustand";

import { createDepositSwapBoxStore, DepositSwapBoxState } from "./deposit-swap-box-store";

const useDepositSwapBoxGeneralStore: UseBoundStore<StoreApi<DepositSwapBoxState>> = createDepositSwapBoxStore();
const useDepositSwapBoxDialogStore: UseBoundStore<StoreApi<DepositSwapBoxState>> = createDepositSwapBoxStore();

const useDepositSwapBoxStore = (isDialog?: boolean): UseBoundStore<StoreApi<DepositSwapBoxState>> => {
  if (!isDialog) {
    return useDepositSwapBoxGeneralStore;
  } else {
    return useDepositSwapBoxDialogStore;
  }
};

export { useDepositSwapBoxStore };
