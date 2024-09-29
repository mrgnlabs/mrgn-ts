import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";

interface ActionBoxState {
  // State
  isSettingsDialogOpen: boolean;
  priorityFee: number;
  slippageBps: number;

  // Actions
  setIsSettingsDialogOpen: (isOpen: boolean) => void;
  setPriorityFee: (priorityFee: number) => void;
  setSlippageBps: (slippageBps: number) => void;
}

function createActionBoxStore() {
  return create<ActionBoxState>()(
    persist(stateCreator, {
      name: "actionBoxStore",
      onRehydrateStorage: () => (state) => {
        // overwrite priority fee
        if (process.env.NEXT_PUBLIC_INIT_PRIO_FEE && process.env.NEXT_PUBLIC_INIT_PRIO_FEE !== "0") {
          state?.setPriorityFee(Number(process.env.NEXT_PUBLIC_INIT_PRIO_FEE));
        }
      },
    })
  );
}

const stateCreator: StateCreator<ActionBoxState, [], []> = (set, get) => ({
  // State
  isSettingsDialogOpen: false,
  slippageBps: 100,
  priorityFee: 0,

  // Actions
  setIsSettingsDialogOpen: (isOpen: boolean) => set({ isSettingsDialogOpen: isOpen }),
  setPriorityFee: (priorityFee: number) => set({ priorityFee: priorityFee }),
  setSlippageBps: (slippageBps: number) => set({ slippageBps: slippageBps }),
});

export { createActionBoxStore };
export type { ActionBoxState };
