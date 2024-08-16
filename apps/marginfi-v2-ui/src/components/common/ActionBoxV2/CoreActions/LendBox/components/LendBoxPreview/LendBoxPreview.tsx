import React from "react";
import { useLendBoxStore } from "../../store";
import { LendType } from "@mrgnlabs/marginfi-v2-ui-state";
import { generateLendingStats } from "./lendBoxPreviewUtils";

interface LendBoxPreviewProps {}

export const LendBoxPreview = ({}: LendBoxPreviewProps) => {
  const [actionSummary, selectedBank, isLoading, lendMode] = useLendBoxStore((state) => [
    state.actionSummary,
    state.selectedBank,
    state.isLoading,
    state.lendMode,
  ]);

  const isLending = React.useMemo(() => lendMode === LendType.Deposit || lendMode === LendType.Withdraw, [lendMode]);

  const stats = React.useMemo(
    () =>
      actionSummary && selectedBank ? generateLendingStats(actionSummary, selectedBank, isLending, isLoading) : null,
    [actionSummary, selectedBank, isLending, isLoading]
  );

  return <div>Lend Box Preview</div>;
};
