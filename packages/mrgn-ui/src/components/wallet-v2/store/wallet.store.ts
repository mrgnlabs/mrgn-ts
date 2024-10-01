import { create, StateCreator } from "zustand";

interface WalletState {
  // State
  isWalletOpen: boolean;
  isWalletSignUpOpen: boolean;

  // Actions
  setIsWalletOpen: (isOpen: boolean) => void;
  setIsWalletSignUpOpen: (isOpen: boolean) => void;
}

function createWalletStore() {
  return create<WalletState>(stateCreator);
}

const stateCreator: StateCreator<WalletState, [], []> = (set, get) => ({
  // State
  isWalletOpen: false,
  isWalletSignUpOpen: false,

  // Actions
  setIsWalletOpen: (isOpen: boolean) => set({ isWalletOpen: isOpen }),
  setIsWalletSignUpOpen: (isOpen: boolean) => set({ isWalletSignUpOpen: isOpen }),
});

const useWalletStore = createWalletStore();

export { useWalletStore };
export type { WalletState };
