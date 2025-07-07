import React from "react";

import { ActionType } from "@mrgnlabs/mrgn-state";

import {
  LendBox,
  LendBoxProps,
  LoopBox,
  LoopBoxProps,
  RepayBox,
  StakeBox,
  StakeBoxProps,
  DepositSwapBoxProps,
  DepositSwapBox,
  AddPositionBox,
  AddPositionBoxProps,
} from "./actions";
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
  RequiredDepositSwapBoxProps,
  RequiredAddPositionBoxProps,
} from "./types";

const ActionBox: ActionBoxComponent = (props) => {
  if (isDialogWrapperProps(props)) {
    const dialogProps = props.dialogProps;

    return (
      <>
        <ActionDialogWrapper
          title={dialogProps?.title}
          trigger={dialogProps?.trigger}
          isTriggered={dialogProps?.isTriggered}
          onClose={dialogProps?.onClose}
          hidden={dialogProps?.hidden}
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

const DepositSwap = (
  props: ActionBoxProps & { depositSwapProps: RequiredDepositSwapBoxProps | DepositSwapBoxProps; useProvider?: boolean }
) => {
  const contextProps = useActionBoxContext();
  const { depositSwapProps, useProvider, ...actionBoxProps } = props;

  let combinedProps: DepositSwapBoxProps;

  if (useProvider && contextProps) {
    combinedProps = {
      ...contextProps,
      ...(depositSwapProps as RequiredDepositSwapBoxProps),
    };
  } else {
    combinedProps = depositSwapProps as DepositSwapBoxProps;
  }

  return (
    <ActionBox {...actionBoxProps}>
      <ActionBoxWrapper showSettings={false} isDialog={props.isDialog} actionMode={ActionType.Deposit}>
        <ActionBoxNavigator selectedAction={ActionType.Deposit}>
          <DepositSwapBox {...combinedProps} isDialog={props.isDialog} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};
ActionBox.DepositSwap = DepositSwap;

const AddPosition = (
  props: ActionBoxProps & { addPositionProps: RequiredAddPositionBoxProps | AddPositionBoxProps; useProvider?: boolean }
) => {
  const contextProps = useActionBoxContext();
  const { addPositionProps, useProvider, ...actionBoxProps } = props;

  let combinedProps: AddPositionBoxProps;

  if (useProvider && contextProps) {
    combinedProps = {
      ...contextProps,
      ...(addPositionProps as RequiredAddPositionBoxProps),
    };
  } else {
    combinedProps = addPositionProps as AddPositionBoxProps;
  }

  return (
    <ActionBox {...actionBoxProps}>
      <ActionBoxWrapper showSettings={false} isDialog={props.isDialog} actionMode={ActionType.Deposit}>
        <ActionBoxNavigator selectedAction={ActionType.Deposit}>
          <AddPositionBox {...combinedProps} isDialog={props.isDialog} />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};

ActionBox.AddPosition = AddPosition;

// const AddReduce = (
//   props: ActionBoxProps & { lendProps: RequiredLoopBoxProps | LendBoxProps; useProvider?: boolean }
// ) => {
//   const contextProps = useActionBoxContext();
//   const { lendProps, useProvider, ...actionBoxProps } = props;

//   const [selectedAction, setSelectedAction] = React.useState(lendProps.requestedLendType);
//   React.useEffect(() => {
//     setSelectedAction(lendProps.requestedLendType);
//   }, [lendProps.requestedLendType]);

//   let combinedProps: LendBoxProps =
//     useProvider && contextProps
//       ? { ...contextProps, ...(lendProps as RequiredLendBoxProps) }
//       : (lendProps as LendBoxProps);

//   // State to store whether the action box should be hidden
//   const [shouldBeHidden, setShouldBeHidden] = React.useState<boolean>(!!combinedProps.searchMode);

//   if (actionBoxProps.isDialog) {
//     actionBoxProps.dialogProps = { ...actionBoxProps.dialogProps, hidden: shouldBeHidden };
//   }

//   return (
//     <ActionBox {...actionBoxProps}>
//       <ActionBoxWrapper showSettings={false} isDialog={actionBoxProps.isDialog} actionMode={ActionType.Deposit}>
//         <ActionBoxNavigator
//           selectedAction={selectedAction}
//           onSelectAction={setSelectedAction}
//           actionTypes={[ActionType.Deposit, ActionType.Borrow]}
//         >
//           <LendBox
//             {...combinedProps}
//             requestedLendType={ActionType.Deposit}
//             onCloseDialog={actionBoxProps.isDialog ? actionBoxProps.dialogProps?.onClose : undefined}
//             searchMode={combinedProps.searchMode}
//             shouldBeHidden={shouldBeHidden}
//             setShouldBeHidden={setShouldBeHidden}
//           />
//           <LendBox
//             {...combinedProps}
//             requestedLendType={ActionType.Borrow}
//             onCloseDialog={actionBoxProps.isDialog ? actionBoxProps.dialogProps?.onClose : undefined}
//             searchMode={combinedProps.searchMode}
//             shouldBeHidden={shouldBeHidden}
//             setShouldBeHidden={setShouldBeHidden}
//           />
//         </ActionBoxNavigator>
//       </ActionBoxWrapper>
//     </ActionBox>
//   );
// };
// ActionBox.BorrowLend = AddReduce;

const BorrowLend = (
  props: ActionBoxProps & { lendProps: RequiredLendBoxProps | LendBoxProps; useProvider?: boolean }
) => {
  const contextProps = useActionBoxContext();
  const { lendProps, useProvider, ...actionBoxProps } = props;

  const [selectedAction, setSelectedAction] = React.useState(lendProps.requestedLendType);
  React.useEffect(() => {
    setSelectedAction(lendProps.requestedLendType);
  }, [lendProps.requestedLendType]);

  let combinedProps: LendBoxProps =
    useProvider && contextProps
      ? { ...contextProps, ...(lendProps as RequiredLendBoxProps) }
      : (lendProps as LendBoxProps);

  if (actionBoxProps.isDialog) {
    actionBoxProps.dialogProps = { ...actionBoxProps.dialogProps };
  }

  return (
    <ActionBox {...actionBoxProps}>
      <ActionBoxWrapper showSettings={false} isDialog={actionBoxProps.isDialog} actionMode={ActionType.Deposit}>
        <ActionBoxNavigator
          selectedAction={selectedAction}
          onSelectAction={setSelectedAction}
          actionTypes={[ActionType.Deposit, ActionType.Borrow]}
          onClose={actionBoxProps.isDialog ? actionBoxProps.dialogProps?.onClose : undefined}
        >
          <LendBox
            {...combinedProps}
            requestedLendType={ActionType.Deposit}
            onCloseDialog={actionBoxProps.isDialog ? actionBoxProps.dialogProps?.onClose : undefined}
          />
          <LendBox
            {...combinedProps}
            requestedLendType={ActionType.Borrow}
            onCloseDialog={actionBoxProps.isDialog ? actionBoxProps.dialogProps?.onClose : undefined}
          />
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
        <ActionBoxNavigator selectedAction={ActionType.Repay}>
          <RepayBox {...combinedProps} />
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

  const [selectedAction, setSelectedAction] = React.useState(stakeProps.requestedActionType);
  React.useEffect(() => {
    setSelectedAction(stakeProps.requestedActionType);
  }, [stakeProps.requestedActionType]);

  const requestedBank =
    "requestedBank" in stakeProps ? stakeProps.requestedBank : "lstBank" in stakeProps ? stakeProps.lstBank : undefined;

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
      <ActionBoxWrapper showSettings={true} isDialog={props.isDialog} actionMode={selectedAction}>
        <ActionBoxNavigator
          selectedAction={selectedAction}
          onSelectAction={setSelectedAction}
          actionTypes={[ActionType.MintLST, ActionType.UnstakeLST, ActionType.InstantUnstakeLST]}
        >
          <StakeBox {...combinedProps} requestedActionType={ActionType.MintLST} isDialog={props.isDialog} />
          <StakeBox
            {...combinedProps}
            requestedActionType={ActionType.UnstakeLST}
            requestedBank={requestedBank}
            isDialog={props.isDialog}
          />
          <StakeBox
            {...combinedProps}
            requestedActionType={ActionType.InstantUnstakeLST}
            requestedBank={requestedBank}
            isDialog={props.isDialog}
          />
        </ActionBoxNavigator>
      </ActionBoxWrapper>
    </ActionBox>
  );
};

ActionBox.Stake = Stake;

ActionBox.displayName = "ActionBox";

export { ActionBox };
