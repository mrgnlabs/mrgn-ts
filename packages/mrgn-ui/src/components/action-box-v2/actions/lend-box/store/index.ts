import { StoreApi, UseBoundStore } from "zustand";

import { createLendBoxStore, LendBoxState } from "./lend-box-store";

const useLendBoxGeneralStore: UseBoundStore<StoreApi<LendBoxState>> = createLendBoxStore();
const useLendBoxDialogStore: UseBoundStore<StoreApi<LendBoxState>> = createLendBoxStore();

const useLendBoxStore = (isDialog?: boolean): UseBoundStore<StoreApi<LendBoxState>> => {
  if (!isDialog) {
    return useLendBoxGeneralStore;
  } else {
    return useLendBoxDialogStore;
  }
};

export { useLendBoxStore };
