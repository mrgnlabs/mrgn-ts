import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { LendBox, LendBoxProps, LoopBox, LoopBoxProps, RepayCollatBox, StakeBox, StakeBoxProps } from "./actions";
import { ActionDialogWrapper, ActionBoxWrapper, ActionBoxNavigator } from "./components";
import { useActionBoxContext, useStakeBoxContext } from "./contexts";
import {
  ActionBoxComponent,
  ActionBoxProps,
  RepayBoxProps,
  isDialogWrapperProps,
  RequiredLendBoxProps,
  RequiredStakeBoxProps,
  RequiredRepayBoxProps,
  RequiredLoopBoxProps,
} from "./types";

const ActionBox: ActionBoxComponent = (props) => {
  if (isDialogWrapperProps(props)) {
    const dialogProps = props.dialogProps;

    return (
      <>
        <ActionDialogWrapper
          title={dialogProps.title}
          trigger={dialogProps.trigger}
          isTriggered={dialogProps.isTriggered}
        >
          {props.children}
        </ActionDialogWrapper>
      </>
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
    <ActionBox {...actionBoxProps}>
      <ActionBoxWrapper showSettings={false} isDialog={props.isDialog} actionMode={props.lendProps.requestedLendType}>
        <ActionBoxNavigator selectedAction={props.lendProps.requestedLendType}>
          <LendBox {...combinedProps} isDialog={props.isDialog} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};
ActionBox.Lend = Lend;

const BorrowLend = (
  props: ActionBoxProps & { lendProps: RequiredLendBoxProps | LendBoxProps; useProvider?: boolean }
) => {
  const contextProps = useActionBoxContext();
  const [selectedAction, setSelectedAction] = React.useState(ActionType.Deposit);
  const { lendProps, useProvider, ...actionBoxProps } = props;

  React.useEffect(() => {
    setSelectedAction(lendProps.requestedLendType);
  }, [lendProps.requestedLendType]);

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
    <ActionBox {...actionBoxProps}>
      <ActionBoxWrapper showSettings={false} isDialog={actionBoxProps.isDialog} actionMode={ActionType.Deposit}>
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
      ...(repayProps as RequiredRepayBoxProps),
    };
  } else {
    combinedProps = repayProps as RepayBoxProps;
  }

  return (
    <ActionBox {...actionBoxProps}>
      <ActionBoxWrapper showSettings={true} isDialog={actionBoxProps.isDialog} actionMode={ActionType.Repay}>
        <ActionBoxNavigator
          selectedAction={selectedAction}
          onSelectAction={setSelectedAction}
          actionTypes={[ActionType.Repay, ActionType.RepayCollat]}
        >
          <LendBox {...combinedProps} requestedLendType={ActionType.Repay} isDialog={actionBoxProps.isDialog} />
          <RepayCollatBox {...combinedProps} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};
ActionBox.Repay = Repay;

const Loop = (props: ActionBoxProps & { loopProps: RequiredLoopBoxProps | LoopBoxProps; useProvider?: boolean }) => {
  const contextProps = useActionBoxContext();
  const { loopProps, useProvider, ...actionBoxProps } = props;

  let combinedProps: LoopBoxProps;

  if (useProvider && contextProps) {
    combinedProps = {
      ...contextProps,
      ...(loopProps as RequiredLoopBoxProps),
    };
  } else {
    combinedProps = loopProps as LoopBoxProps;
  }

  return (
    <ActionBox {...actionBoxProps}>
      <ActionBoxWrapper showSettings={true} isDialog={props.isDialog} actionMode={ActionType.Loop}>
        <ActionBoxNavigator selectedAction={ActionType.Loop}>
          <LoopBox {...combinedProps} isDialog={props.isDialog} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};
ActionBox.Loop = Loop;

const Stake = (
  props: ActionBoxProps & { stakeProps: StakeBoxProps | RequiredStakeBoxProps; useProvider?: boolean }
) => {
  const contextProps = useActionBoxContext();
  const stakeContextProps = useStakeBoxContext();
  const { stakeProps, useProvider, ...actionBoxProps } = props;

  let combinedProps: StakeBoxProps;

  if (useProvider && contextProps) {
    combinedProps = {
      ...contextProps,
      ...(stakeProps as RequiredStakeBoxProps),
      ...stakeContextProps,
    };
  } else {
    combinedProps = stakeProps as StakeBoxProps;
  }
  return (
    <ActionBox {...actionBoxProps}>
      <ActionBoxWrapper showSettings={true} isDialog={props.isDialog} actionMode={stakeProps.requestedActionType}>
        <ActionBoxNavigator selectedAction={stakeProps.requestedActionType}>
          <StakeBox {...combinedProps} isDialog={props.isDialog} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};

ActionBox.Stake = Stake;

ActionBox.displayName = "ActionBox";

export { ActionBox };
