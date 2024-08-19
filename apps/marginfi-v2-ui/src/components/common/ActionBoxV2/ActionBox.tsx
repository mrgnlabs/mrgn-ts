import React from "react";

// Import your subcomponents
import { LendBox, LendBoxProps } from "./CoreActions/LendBox";
// import FlashLoanActionbox from "./FlashLoan/FlashLoanActionbox";
// import LSTActionbox from "./LST/LSTActionbox";

import { ActionDialogWrapper, ActionDialogProps } from "./sharedComponents";

type ActionboxDialogProps = {
  isDialog: true;
  dialogProps: ActionDialogProps;
};

type ActionboxWithoutDailogProps = {
  isDialog: false;
};

type ActionboxProps = ActionboxWithoutDailogProps | ActionboxDialogProps;

const isDialogWrapperProps = (props: ActionboxProps): props is ActionboxDialogProps => props.isDialog === true;

interface ActionboxComponentProps {
  children: React.ReactNode;
}

interface ActionboxComponent extends React.FC<ActionboxProps & ActionboxComponentProps> {
  Lend: React.FC<ActionboxProps & { lendProps: LendBoxProps }>;
  FlashLoan: React.FC<ActionboxProps>;
  LST: React.FC<ActionboxProps>;
}

const Actionbox: ActionboxComponent = (props) => {
  if (isDialogWrapperProps(props)) {
    const dialogProps = props.dialogProps;

    return (
      <ActionDialogWrapper
        title={dialogProps.title}
        trigger={dialogProps.trigger}
        isTriggered={dialogProps.isTriggered}
      >
        {props.children}
      </ActionDialogWrapper>
    );
  }

  return <>{props.children}</>;
};

// Assign subcomponents as static properties
Actionbox.Lend = (props: ActionboxProps & { lendProps: LendBoxProps }) => (
  <Actionbox {...props}>
    <LendBox isDialog={props.isDialog} {...props.lendProps} />
  </Actionbox>
);
// Actionbox.LendBorrow
Actionbox.FlashLoan = () => <div>FlashLoan</div>;
Actionbox.LST = () => <div>LST</div>;

Actionbox.displayName = "Actionbox";

export default Actionbox;
