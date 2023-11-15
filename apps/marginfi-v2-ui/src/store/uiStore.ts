import { create, StateCreator } from "zustand";

interface UiState {
  // State
  isMenuDrawerOpen: boolean;
  isFetchingData: boolean;
  isWalletAuthDialogOpen: boolean;
  isWalletOpen: boolean;
  isWalletOnrampActive: boolean;

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => void;
  setIsFetchingData: (isOpen: boolean) => void;
  setIsWalletAuthDialogOpen: (isOpen: boolean) => void;
  setIsWalletOpen: (isOpen: boolean) => void;
  setIsOnrampActive: (isOnrampActive: boolean) => void;
}

function createUiStore() {
  return create<UiState>(stateCreator);
}

const stateCreator: StateCreator<UiState, [], []> = (set, get) => ({
  // State
  isMenuDrawerOpen: false,
  isFetchingData: false,
  isWalletAuthDialogOpen: false,
  isWalletOpen: false,
  isWalletOnrampActive: false,

  // Actions
  setIsMenuDrawerOpen: (isOpen: boolean) => set({ isMenuDrawerOpen: isOpen }),
  setIsFetchingData: (isFetchingData: boolean) => set({ isFetchingData }),
  setIsWalletAuthDialogOpen: (isOpen: boolean) => set({ isWalletAuthDialogOpen: isOpen }),
  setIsWalletOpen: (isOpen: boolean) => set({ isWalletOpen: isOpen }),
  setIsOnrampActive: (isOnrampActive: boolean) => set({ isWalletOnrampActive: isOnrampActive }),
});

export { createUiStore };
export type { UiState };
