import { create, StateCreator } from "zustand";

interface UiState {
  // State
  isMenuDrawerOpen: boolean;
  isFetchingData: boolean;

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => void;
  setIsFetchingData: (isOpen: boolean) => void;
}

function createUiStore() {
  return create<UiState>(stateCreator);
}

const stateCreator: StateCreator<UiState, [], []> = (set, get) => ({
  // State
  isMenuDrawerOpen: false,
  isFetchingData: false,

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => set({ isMenuDrawerOpen: isOpen }),
  setIsFetchingData: (isFetchingData: boolean) => set({ isFetchingData }),
});

export { createUiStore };
export type { UiState };
