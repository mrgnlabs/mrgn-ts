import React from "react";

import { useUiStore } from "~/store";
import { LendingModes } from "~/types";

import { ActionBox } from "~/components/common/ActionBox";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

export const ActionBoxLendWrapper = () => {
  const [lendingModeFromStore, setLendingMode] = useUiStore((state) => [state.lendingMode, state.setLendingMode]);

  return (
    <div className="p-4 space-y-4">
      <div className="text-center w-full">
        <p className="text-muted-foreground">Supply. Earn interest. Borrow. Repeat.</p>
      </div>
      <ActionBox showLendingHeader={true} />
    </div>
  );
};
