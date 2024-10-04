import { StoreApi, UseBoundStore } from "zustand";

import { createLoopBoxStore, LoopBoxState } from "./loop-store";

export const useLoopBoxStore: UseBoundStore<StoreApi<LoopBoxState>> = createLoopBoxStore();
