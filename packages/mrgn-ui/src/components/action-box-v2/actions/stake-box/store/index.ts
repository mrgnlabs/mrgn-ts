import { StoreApi, UseBoundStore } from "zustand";

import { createStakeBoxStore, StateBoxState } from "./stake-box-store";

const useStakeBoxGeneralStore: UseBoundStore<StoreApi<StateBoxState>> = createStakeBoxStore();
const useStakeBoxDialogStore: UseBoundStore<StoreApi<StateBoxState>> = createStakeBoxStore();

const useStakeBoxStore = (isDialog?: boolean): UseBoundStore<StoreApi<StateBoxState>> => {
  if (!isDialog) {
    return useStakeBoxGeneralStore;
  } else {
    return useStakeBoxDialogStore;
  }
};

export { useStakeBoxStore };
