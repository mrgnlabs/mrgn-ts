import { create, StateCreator } from "zustand";
import { PublicKey } from "@solana/web3.js";
import { ActionType, ExtendedBankInfo, ValidatorStakeGroup } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMessageType, ActionTxns } from "@mrgnlabs/mrgn-utils";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";

interface LendBoxState {
  // State
  amountRaw: string;

  lendMode: ActionType;
  selectedBank: ExtendedBankInfo | null;

  stakeAccounts: ValidatorStakeGroup[];
  selectedStakeAccount: {
    address: PublicKey;
    balance: number;
  } | null;

  simulationResult: SimulationResult | null;
  actionTxns: ActionTxns;

  errorMessage: ActionMessageType | null;

  // Actions
  refreshState: (actionMode?: ActionType) => void;
  refreshSelectedBanks: (banks: ExtendedBankInfo[]) => void;
  fetchActionBoxState: (args: { requestedLendType?: ActionType; requestedBank?: ExtendedBankInfo }) => void;
  setLendMode: (lendMode: ActionType) => void;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: ActionTxns) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setErrorMessage: (errorMessage: ActionMessageType | null) => void;
  setStakeAccounts: (stakeAccounts: ValidatorStakeGroup[]) => void;
  setSelectedStakeAccount: (stakeAccount: { address: PublicKey; balance: number } | null) => void;
}

function createLendBoxStore() {
  return create<LendBoxState>(stateCreator);
}

const initialState = {
  amountRaw: "",
  simulationResult: null,
  lendMode: ActionType.Deposit,
  selectedBank: null,
  actionTxns: { actionTxn: null, additionalTxns: [] },
  errorMessage: null,
  selectedStakeAccount: null,
  stakeAccounts: [],
};

const stateCreator: StateCreator<LendBoxState, [], []> = (set, get) => ({
  // State
  ...initialState,

  refreshState(lendMode?: ActionType) {
    if (lendMode) {
      set({ ...initialState, lendMode });
    } else {
      set({ ...initialState });
    }
  },

  fetchActionBoxState(args) {
    let requestedAction: ActionType;
    let requestedBank: ExtendedBankInfo | null = null;
    const lendMode = get().lendMode;

    if (args.requestedLendType) {
      requestedAction = args.requestedLendType;
    } else {
      requestedAction = initialState.lendMode;
    }

    if (args.requestedBank) {
      requestedBank = args.requestedBank;
    } else {
      requestedBank = null;
    }

    const selectedBank = get().selectedBank;

    const needRefresh =
      !selectedBank ||
      !requestedAction ||
      lendMode !== requestedAction ||
      (requestedBank && !requestedBank.address.equals(selectedBank.address));

    if (needRefresh) set({ ...initialState, lendMode: requestedAction, selectedBank: requestedBank });
  },

  async setAmountRaw(amountRaw, maxAmount) {
    if (!maxAmount) {
      set({ amountRaw });
    } else {
      const strippedAmount = amountRaw.replace(/,/g, "");
      let amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
      const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 });

      if (amount && amount > maxAmount) {
        amount = maxAmount;
      }

      set({ amountRaw: numberFormatter.format(amount) });
    }
  },

  refreshSelectedBanks(banks: ExtendedBankInfo[]) {
    const selectedBank = get().selectedBank;

    if (selectedBank) {
      const updatedBank = banks.find((v) => v.address.equals(selectedBank.address));
      if (updatedBank) {
        set({ selectedBank: updatedBank });
      }
    }
  },

  setSelectedBank(tokenBank) {
    const selectedBank = get().selectedBank;
    const hasBankChanged = !tokenBank || !selectedBank || !tokenBank.address.equals(selectedBank.address);

    if (hasBankChanged) {
      const data: Partial<LendBoxState> = {
        selectedBank: tokenBank,
        amountRaw: "",
        errorMessage: null,
      };

      if (tokenBank?.info.rawBank.config.assetTag === 2) {
        const stakeAccounts = get().stakeAccounts;
        const stakeAccount = stakeAccounts.find((stakeAccount) =>
          stakeAccount.validator.equals(tokenBank.meta.stakePool?.validatorVoteAccount || PublicKey.default)
        );
        if (stakeAccount) {
          data.selectedStakeAccount = {
            address: stakeAccount.accounts[0].pubkey,
            balance: stakeAccount.accounts[0].amount,
          };
        }
      }

      set(data);
    }
  },

  setLendMode(lendMode) {
    const selectedActionMode = get().lendMode;
    const hasActionModeChanged = !selectedActionMode || lendMode !== selectedActionMode;

    if (hasActionModeChanged) set({ amountRaw: "", errorMessage: null });

    set({ lendMode });
  },

  setActionTxns(actionTxns) {
    set({ actionTxns });
  },

  setSimulationResult(simulationResult) {
    set({ simulationResult });
  },

  setErrorMessage(errorMessage) {
    set({ errorMessage });
  },

  setStakeAccounts(stakeAccounts) {
    set({ stakeAccounts });
  },

  setSelectedStakeAccount(stakeAccount) {
    set({ selectedStakeAccount: stakeAccount });
  },
});

export { createLendBoxStore };
export type { LendBoxState };
