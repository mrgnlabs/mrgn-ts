import React from "react";

// Import your subcomponents
import { LendBox, LendBoxProps } from "./actions";

import { ActionDialogWrapper, ActionDialogProps, ActionBoxWrapper, ActionBoxNavigator } from "./components";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

type ActionBoxDialogProps = {
  isDialog: true;
  dialogProps: ActionDialogProps;
};

type ActionBoxWithoutDailogProps = {
  isDialog?: false;
};

type ActionBoxProps = ActionBoxWithoutDailogProps | ActionBoxDialogProps;

const isDialogWrapperProps = (props: ActionBoxProps): props is ActionBoxDialogProps => props.isDialog === true;

interface ActionBoxComponentProps {
  children: React.ReactNode;
}

interface BorrowLendBoxProps
  extends Pick<
    LendBoxProps,
    | "nativeSolBalance"
    // | "tokenAccountMap"
    | "selectedAccount"
    | "banks"
    | "accountSummary"
    | "onComplete"
    | "connected"
    | "captureEvent"
    | "onConnect"
    | "requestedBank"
    | "walletContextState"
  > {}

interface ActionBoxComponent extends React.FC<ActionBoxProps & ActionBoxComponentProps> {
  Lend: React.FC<ActionBoxProps & { lendProps: LendBoxProps }>;
  LendBorrow: React.FC<ActionBoxProps & { lendProps: BorrowLendBoxProps }>;
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
        <LendBox {...props.lendProps} />
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
          <LendBox requestedLendType={ActionType.Deposit} {...props.lendProps} />
          <LendBox requestedLendType={ActionType.Borrow} {...props.lendProps} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};

ActionBox.displayName = "ActionBox";

export { ActionBox };
