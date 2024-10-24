import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import { PreviousTxn, DEFAULT_BUNDLE_TIP_LAMPORTS } from "@mrgnlabs/mrgn-utils";

interface ActionBoxState {
  // State
  isSettingsDialogOpen: boolean;
  priorityFee: number;
  slippageBps: number;
  bundleTip: number;
  platformFeeBps: number;
  isActionComplete: boolean;
  previousTxn: PreviousTxn | null;

  // Actions
  setIsActionComplete: (isActionSuccess: boolean) => void;
  setPreviousTxn: (previousTxn: PreviousTxn) => void;
  setIsSettingsDialogOpen: (isOpen: boolean) => void;
  setPriorityFee: (priorityFee: number) => void;
  setSlippageBps: (slippageBps: number) => void;
  setPlatformFeeBps: (platformFeeBps: number) => void;
  setBundleTip: (bundleTip: number) => void;
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
  platformFeeBps: 30,
  isActionComplete: false,
  previousTxn: null,
  bundleTip: DEFAULT_BUNDLE_TIP_LAMPORTS, // 100_000 lamports = 0.0001 SOL

  // Actions
  setIsSettingsDialogOpen: (isOpen: boolean) => set({ isSettingsDialogOpen: isOpen }),
  setPriorityFee: (priorityFee: number) => set({ priorityFee: priorityFee }),
  setSlippageBps: (slippageBps: number) => set({ slippageBps: slippageBps }),
  setIsActionComplete: (isActionSuccess: boolean) => set({ isActionComplete: isActionSuccess }),
  setPreviousTxn: (previousTxn: PreviousTxn) => set({ previousTxn: previousTxn }),
  setPlatformFeeBps: (platformFeeBps: number) => set({ platformFeeBps: platformFeeBps }),
  setBundleTip: (bundleTip: number) => set({ bundleTip: bundleTip }),
});

export { createActionBoxStore };
export type { ActionBoxState };
