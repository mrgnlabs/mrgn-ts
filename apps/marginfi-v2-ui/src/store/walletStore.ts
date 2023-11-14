import { create, StateCreator } from "zustand";

export interface WalletState {
  // State
  isWalletAuthDialogOpen: boolean;
  isWalletOpen: boolean;

  // Actions
  setIsWalletAuthDialogOpen: (isOpen: boolean) => void;
  setIsWalletOpen: (isOpen: boolean) => void;
}

const stateCreator: StateCreator<WalletState, [], []> = (set, get) => ({
  // State
  isWalletAuthDialogOpen: false,
  isWalletOpen: false,

  // Actions
  setIsWalletAuthDialogOpen: (isOpen: boolean) => set({ isWalletAuthDialogOpen: isOpen }),
  setIsWalletOpen: (isOpen: boolean) => set({ isWalletOpen: isOpen }),
});

export const createWalletStore = () => {
  return create<WalletState>(stateCreator);
};
