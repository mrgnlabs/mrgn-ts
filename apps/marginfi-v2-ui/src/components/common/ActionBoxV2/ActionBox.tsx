import React from "react";

// Import your subcomponents
import { LendBox, LendBoxProps } from "./CoreActions";
// import FlashLoanActionBox from "./FlashLoan/FlashLoanActionBox";
// import LSTActionBox from "./LST/LSTActionBox";

import { ActionDialogWrapper, ActionDialogProps, ActionBoxWrapper, ActionBoxNavigator } from "./sharedComponents";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

type ActionBoxDialogProps = {
  isDialog: true;
  dialogProps: ActionDialogProps;
};

type ActionBoxWithoutDailogProps = {
  isDialog: false;
};

type ActionBoxProps = ActionBoxWithoutDailogProps | ActionBoxDialogProps;

const isDialogWrapperProps = (props: ActionBoxProps): props is ActionBoxDialogProps => props.isDialog === true;

interface ActionBoxComponentProps {
  children: React.ReactNode;
}

interface BorrowLendBoxProps
  extends Pick<
    LendBoxProps,
    "nativeSolBalance" | "tokenAccountMap" | "selectedAccount" | "banks" | "accountSummary" | "onComplete"
  > {}

interface ActionBoxComponent extends React.FC<ActionBoxProps & ActionBoxComponentProps> {
  Lend: React.FC<ActionBoxProps & { lendProps: LendBoxProps }>;
  LendBorrow: React.FC<ActionBoxProps & { lendProps: BorrowLendBoxProps }>;
  FlashLoan: React.FC<ActionBoxProps>;
  LST: React.FC<ActionBoxProps>;
}

const ActionBox: ActionBoxComponent = (props) => {
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
ActionBox.Lend = (props: ActionBoxProps & { lendProps: LendBoxProps }) => (
  <ActionBox {...props}>
    <ActionBoxWrapper isDialog={props.isDialog} actionMode={props.lendProps.requestedLendType}>
      <ActionBoxNavigator selectedAction={props.lendProps.requestedLendType}>
        <LendBox isDialog={props.isDialog} {...props.lendProps} />
      </ActionBoxNavigator>
    </ActionBoxWrapper>
  </ActionBox>
);
ActionBox.LendBorrow = (props: ActionBoxProps & { lendProps: BorrowLendBoxProps }) => {
  const [selectedAction, setSelectedAction] = React.useState(ActionType.Deposit);
  return (
    <ActionBox {...props}>
      <ActionBoxWrapper isDialog={props.isDialog} actionMode={ActionType.Deposit}>
        <ActionBoxNavigator
          selectedAction={selectedAction}
          onSelectAction={setSelectedAction}
          actionTypes={[ActionType.Deposit, ActionType.Borrow]}
        >
          <LendBox isDialog={props.isDialog} requestedLendType={ActionType.Deposit} {...props.lendProps} />
          <LendBox isDialog={props.isDialog} requestedLendType={ActionType.Borrow} {...props.lendProps} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};

ActionBox.FlashLoan = () => <div>FlashLoan</div>;
ActionBox.LST = () => <div>LST</div>;

ActionBox.displayName = "ActionBox";

export default ActionBox;
