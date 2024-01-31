import React from "react";

import { useUiStore } from "~/store";
import { LendingModes } from "~/types";

import { ActionBox } from "~/components/common/ActionBox";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

export const ActionBoxLendWrapper = () => {
  const [lendingModeFromStore, setLendingMode] = useUiStore((state) => [state.lendingMode, state.setLendingMode]);

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
