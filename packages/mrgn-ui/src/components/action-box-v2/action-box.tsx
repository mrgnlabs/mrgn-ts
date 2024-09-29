import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendBox, LendBoxProps, RepayCollatBox, RepayCollatBoxProps } from "./actions";
import { ActionDialogWrapper, ActionBoxWrapper, ActionBoxNavigator } from "./components";
import { useActionBoxContext } from "./contexts";
import {
  ActionBoxComponent,
  ActionBoxProps,
  BorrowLendBoxProps,
  RepayBoxProps,
  isDialogWrapperProps,
  RequiredBorrowLendBoxProps,
  RequiredLendBoxProps,
  RequiredRepayBoxProps,
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
    <ActionBox {...actionBoxProps}>
      <ActionBoxWrapper isDialog={actionBoxProps.isDialog} actionMode={ActionType.Deposit}>
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

const Repay = (
  props: ActionBoxProps & { repayProps: RequiredRepayBoxProps | RepayBoxProps; useProvider?: boolean }
) => {
  const contextProps = useActionBoxContext();
  const [selectedAction, setSelectedAction] = React.useState(ActionType.Repay);
  const { repayProps, useProvider, ...actionBoxProps } = props;

  let combinedProps: RepayBoxProps;

  if (useProvider && contextProps) {
    combinedProps = {
      ...contextProps,
      ...(repayProps as RequiredBorrowLendBoxProps),
    };
  } else {
    combinedProps = repayProps as BorrowLendBoxProps;
  }

  return (
    <ActionBox {...actionBoxProps}>
      <ActionBoxWrapper isDialog={actionBoxProps.isDialog} actionMode={ActionType.Repay}>
        <ActionBoxNavigator
          selectedAction={selectedAction}
          onSelectAction={setSelectedAction}
          actionTypes={[ActionType.Repay, ActionType.RepayCollat]}
        >
          <LendBox {...combinedProps} requestedLendType={ActionType.Repay} />
          <RepayCollatBox {...combinedProps} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};
ActionBox.Repay = Repay;

ActionBox.displayName = "ActionBox";

export { ActionBox };
