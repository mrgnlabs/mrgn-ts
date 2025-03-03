import { StoreApi, UseBoundStore } from "zustand";

import { createAddPositionBoxStore, AddPositionBoxState } from "./add-position.store";

export const useAddPositionBoxStore: UseBoundStore<StoreApi<AddPositionBoxState>> = createAddPositionBoxStore();
