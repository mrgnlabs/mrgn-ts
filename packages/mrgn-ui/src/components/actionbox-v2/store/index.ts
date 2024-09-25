import { StoreApi, UseBoundStore } from "zustand";
import { ActionBoxState, createActionBoxStore } from "./action-box-store";

const useActionBoxStore: UseBoundStore<StoreApi<ActionBoxState>> = createActionBoxStore();

export { useActionBoxStore };
export type { ActionBoxState };
