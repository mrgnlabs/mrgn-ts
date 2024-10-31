import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import { PreviousTxn } from "@mrgnlabs/mrgn-utils";

interface ActionBoxState {
  // State
  isSettingsDialogOpen: boolean;
  slippageBps: number;
  platformFeeBps: number;
  isActionComplete: boolean;
  previousTxn: PreviousTxn | null;

  // Actions
  setIsActionComplete: (isActionSuccess: boolean) => void;
  setPreviousTxn: (previousTxn: PreviousTxn) => void;
  setIsSettingsDialogOpen: (isOpen: boolean) => void;
  setSlippageBps: (slippageBps: number) => void;
  setPlatformFeeBps: (platformFeeBps: number) => void;
}

function createActionBoxStore() {
  return create<ActionBoxState>()(
    persist(stateCreator, {
      name: "actionBoxStore",
      onRehydrateStorage: () => (state) => {},
    })
  );
}

const stateCreator: StateCreator<ActionBoxState, [], []> = (set, get) => ({
  // State
  isSettingsDialogOpen: false,
  slippageBps: 100,
  priorityFee: 0,
  platformFeeBps: 30,
  isActionComplete: false,
  previousTxn: null,

  // Actions
  setIsSettingsDialogOpen: (isOpen: boolean) => set({ isSettingsDialogOpen: isOpen }),
  setSlippageBps: (slippageBps: number) => set({ slippageBps: slippageBps }),
  setIsActionComplete: (isActionSuccess: boolean) => set({ isActionComplete: isActionSuccess }),
  setPreviousTxn: (previousTxn: PreviousTxn) => set({ previousTxn: previousTxn }),
  setPlatformFeeBps: (platformFeeBps: number) => set({ platformFeeBps: platformFeeBps }),
});

export { createActionBoxStore };
export type { ActionBoxState };
