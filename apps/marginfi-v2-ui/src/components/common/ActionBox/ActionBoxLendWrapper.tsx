import React from "react";

import { PublicKey } from "@solana/web3.js";

import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginRequirementType, SimulationResult } from "@mrgnlabs/marginfi-client-v2";

import { useMrgnlendStore, useUiStore } from "~/store";
import {
  MarginfiActionParams,
  clampedNumeralFormatter,
  closeBalance,
  executeLendingAction,
  isWholePosition,
  usePrevious,
  cn,
  capture,
} from "~/utils";
import { LendingModes } from "~/types";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useDebounce } from "~/hooks/useDebounce";

import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";
import { ActionBox } from "~/components/common/ActionBox";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

export const ActionBoxLendWrapper = () => {
  const [lendingModeFromStore, setLendingMode, priorityFee, setIsActionComplete, setPreviousTxn] = useUiStore(
    (state) => [
      state.lendingMode,
      state.setLendingMode,
      state.priorityFee,
      state.setIsActionComplete,
      state.setPreviousTxn,
    ]
  );

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-6 text-center w-full flex flex-col items-center">
        <ToggleGroup
          type="single"
          size="lg"
          value={lendingModeFromStore}
          onValueChange={() => {
            // setSelectedTokenBank(null);
            setLendingMode(lendingModeFromStore === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND);
          }}
        >
          <ToggleGroupItem value="lend" aria-label="Lend">
            Lend
          </ToggleGroupItem>
          <ToggleGroupItem value="borrow" aria-label="Borrow">
            Borrow
          </ToggleGroupItem>
        </ToggleGroup>

        <p className="text-muted-foreground">Supply. Earn interest. Borrow. Repeat.</p>
      </div>
      <ActionBox />
    </div>
  );
};
