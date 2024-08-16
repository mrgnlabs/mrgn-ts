import React from "react";

// Import your subcomponents
import LendActionbox from "./Lend/LendActionbox";
import FlashLoanActionbox from "./FlashLoan/FlashLoanActionbox";
import LSTActionbox from "./LST/LSTActionbox";

const Actionbox = (props) => {
  // const isActionDisabled = React.useMemo(() => {
  //   const blockedActions = getBlockedActions();

  //   if (blockedActions?.find((value) => value === actionMode)) return true;

  //   return false;
  // }, [actionMode]);

  return null; // Since we're using static properties, no render logic is needed here
};

// Assign subcomponents as static properties
Actionbox.Lend = LendActionbox;
// Actionbox.LendBorrow
Actionbox.FlashLoan = FlashLoanActionbox;
Actionbox.LST = LSTActionbox;

export default Actionbox;
