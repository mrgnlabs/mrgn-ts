import { StoreApi, UseBoundStore } from "zustand";
import { ActionBoxState, createActionBoxStore } from "./actionBoxStore";

const useActionBoxStore: UseBoundStore<StoreApi<ActionBoxState>> = createActionBoxStore();

export { useActionBoxStore };
export type { ActionBoxState };
