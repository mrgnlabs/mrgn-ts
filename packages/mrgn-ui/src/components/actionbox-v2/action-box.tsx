import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendBox, LendBoxProps } from "./actions";
import { ActionDialogWrapper, ActionBoxWrapper, ActionBoxNavigator } from "./components";
import { useActionBoxContext } from "./contexts";
import {
  ActionBoxComponent,
  ActionBoxProps,
  BorrowLendBoxProps,
  isDialogWrapperProps,
  RequiredBorrowLendBoxProps,
  RequiredLendBoxProps,
} from "./types";

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

const Lend = (props: ActionBoxProps & { lendProps: RequiredLendBoxProps | LendBoxProps; useProvider?: boolean }) => {
  const contextProps = useActionBoxContext();
  const { lendProps, useProvider, ...actionBoxProps } = props;

  let combinedProps: LendBoxProps;

  if (useProvider && contextProps) {
    combinedProps = {
      ...contextProps,
      ...(lendProps as RequiredLendBoxProps),
    };
  } else {
    combinedProps = lendProps as LendBoxProps;
  }

  return (
    <ActionBox {...props}>
      <ActionBoxWrapper isDialog={props.isDialog} actionMode={props.lendProps.requestedLendType}>
        <ActionBoxNavigator selectedAction={props.lendProps.requestedLendType}>
          <LendBox {...combinedProps} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};
ActionBox.Lend = Lend;

const BorrowLend = (
  props: ActionBoxProps & { lendProps: RequiredBorrowLendBoxProps | BorrowLendBoxProps; useProvider?: boolean }
) => {
  const contextProps = useActionBoxContext();
  const [selectedAction, setSelectedAction] = React.useState(ActionType.Deposit);
  const { lendProps, useProvider, ...actionBoxProps } = props;

  let combinedProps: BorrowLendBoxProps;

  if (useProvider && contextProps) {
    combinedProps = {
      ...contextProps,
      ...(lendProps as RequiredBorrowLendBoxProps),
    };
  } else {
    combinedProps = lendProps as BorrowLendBoxProps;
  }

  return (
    <ActionBox {...props}>
      <ActionBoxWrapper isDialog={props.isDialog} actionMode={ActionType.Deposit}>
        <ActionBoxNavigator
          selectedAction={selectedAction}
          onSelectAction={setSelectedAction}
          actionTypes={[ActionType.Deposit, ActionType.Borrow]}
        >
          <LendBox {...combinedProps} requestedLendType={ActionType.Deposit} />
          <LendBox {...combinedProps} requestedLendType={ActionType.Borrow} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};

ActionBox.BorrowLend = BorrowLend;

ActionBox.displayName = "ActionBox";

export { ActionBox };
