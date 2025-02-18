import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

interface ActionBoxState {
  // State
  isSettingsDialogOpen: boolean;
  platformFeeBps: number;

  // Actions
  setIsSettingsDialogOpen: (isOpen: boolean) => void;
  setPlatformFeeBps: (platformFeeBps: number) => void;
}

function createActionBoxStore() {
  return create<ActionBoxState>()(
    persist(stateCreator, {
      name: "actionBoxStore",
    })
  );
}

const stateCreator: StateCreator<ActionBoxState, [], []> = (set, get) => ({
  // State
  isSettingsDialogOpen: false,
  priorityFee: 0,
  platformFeeBps: 30,

  // Actions
  setIsSettingsDialogOpen: (isOpen: boolean) => set({ isSettingsDialogOpen: isOpen }),
  setPlatformFeeBps: (platformFeeBps: number) => set({ platformFeeBps: platformFeeBps }),
});

export { createActionBoxStore };
export type { ActionBoxState };
