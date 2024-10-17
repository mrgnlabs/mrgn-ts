import { create, StateCreator } from "zustand";
import { persist } from "zustand/middleware";
import { LstData, PreviousTxn } from "@mrgnlabs/mrgn-utils";

interface StakeBoxState {
  // State
  lstData: LstData | null;

  // Actions
  setLstData: (lstData: LstData) => void;
}

function createStakeBoxStore() {
  return create<StakeBoxState>()(
    persist(stateCreator, {
      name: "stakeBoxStore",
    })
  );
}

const stateCreator: StateCreator<StakeBoxState, [], []> = (set, get) => ({
  // State
  lstData: null,

  // Actions
  setLstData: (lstData: LstData) => set({ lstData: lstData }),
});

export { createStakeBoxStore };
export type { StakeBoxState };
