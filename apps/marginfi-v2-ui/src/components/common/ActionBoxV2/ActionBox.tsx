import React from "react";

// Import your subcomponents
import { LendBox, LendBoxProps } from "./CoreActions/LendBox";
// import FlashLoanActionbox from "./FlashLoan/FlashLoanActionbox";
// import LSTActionbox from "./LST/LSTActionbox";

import { DialogWrapper, DialogWrapperProps } from "./sharedComponents";

type ActionboxProps = {
  isDialog?: boolean;
} & Partial<DialogWrapperProps>;

interface ActionboxComponent extends React.FC<ActionboxProps> {
  Lend: React.FC<ActionboxProps & { lendProps: LendBoxProps }>;
  FlashLoan: React.FC<ActionboxProps>;
  LST: React.FC<ActionboxProps>;
}

const Actionbox: ActionboxComponent = ({ isDialog, children, ...dialogProps }) => {
  if (isDialog && dialogProps.title && dialogProps.trigger) {
    return (
      <DialogWrapper title={dialogProps.title} trigger={dialogProps.trigger} isTriggered={dialogProps.isTriggered}>
        {children}
      </DialogWrapper>
    );
  }

  return <>{children}</>;
};
// Assign subcomponents as static properties
Actionbox.Lend = ({ isDialog, lendProps, ...dialogProps }: ActionboxProps & { lendProps: LendBoxProps }) => (
  <Actionbox isDialog={isDialog} {...dialogProps}>
    <LendBox isDialog={isDialog} {...lendProps} />
  </Actionbox>
);
// Actionbox.LendBorrow
Actionbox.FlashLoan = () => <div>FlashLoan</div>;
Actionbox.LST = () => <div>LST</div>;

export default Actionbox;
