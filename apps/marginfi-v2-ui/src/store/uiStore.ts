import { create, StateCreator } from "zustand";

interface UiState {
  // State
  isWalletDrawerOpen: boolean;
  isMenuDrawerOpen: boolean;
  isFetchingData: boolean;

  // Actions
  setIsWalletDrawerOpen: (isOpen: boolean) => void;
  setIsMenuDrawerOpen: (isOpen: boolean) => void;
  setIsFetchingData: (isOpen: boolean) => void;
}

function createUiStore() {
  return create<UiState>(stateCreator);
}

const stateCreator: StateCreator<UiState, [], []> = (set, get) => ({
  // State
  isWalletDrawerOpen: false,
  isMenuDrawerOpen: false,
  isFetchingData: false,

  // Actions
  setIsWalletDrawerOpen: (isOpen: boolean) => set({ isWalletDrawerOpen: isOpen }),
  setIsMenuDrawerOpen: (isOpen: boolean) => set({ isMenuDrawerOpen: isOpen }),
  setIsFetchingData: (isFetchingData: boolean) => set({ isFetchingData }),
});

export { createUiStore };
export type { UiState };
