import { StoreApi, UseBoundStore } from "zustand";
import { ActionBoxState, createActionBoxStore } from "./action-box-store";
import { createStakeBoxStore, StakeBoxState } from "./stake-box-store";

const useActionBoxStore: UseBoundStore<StoreApi<ActionBoxState>> = createActionBoxStore();
const useStakeBoxContextStore: UseBoundStore<StoreApi<StakeBoxState>> = createStakeBoxStore();

export { useActionBoxStore, useStakeBoxContextStore };
export type { ActionBoxState, StakeBoxState };
