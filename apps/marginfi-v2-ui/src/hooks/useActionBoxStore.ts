import { ActionBoxState, useActionBoxDialogStore, useActionBoxGeneralStore } from "~/store";
import { StoreApi, UseBoundStore } from "zustand";

export const useActionBoxStore = (isDialog?: boolean): UseBoundStore<StoreApi<ActionBoxState>> => {
  if (!isDialog) {
    return useActionBoxGeneralStore;
  } else {
    return useActionBoxDialogStore;
  }
};
