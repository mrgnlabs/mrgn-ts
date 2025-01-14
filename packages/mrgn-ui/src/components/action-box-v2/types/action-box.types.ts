import {
  LendBoxProps,
  LoopBoxProps,
  RepayCollatBoxProps,
  StakeBoxProps,
  DepositSwapBoxProps,
} from "~/components/action-box-v2/actions";
import { ActionDialogProps } from "~/components/action-box-v2/components";

type ActionBoxDialogProps = {
  isDialog: true;
  dialogProps: ActionDialogProps;
};

type ActionBoxWithoutDailogProps = {
  isDialog?: false;
};

type ActionBoxProps = ActionBoxWithoutDailogProps | ActionBoxDialogProps;

const isDialogWrapperProps = (props: ActionBoxProps): props is ActionBoxDialogProps => props.isDialog === true;

type ActionBoxComponentProps = {
  children: React.ReactNode;
};

interface RequiredLendBoxProps
  extends Pick<
    LendBoxProps,
    | "onComplete"
    | "captureEvent"
    | "requestedBank"
    | "requestedLendType"
    | "walletContextState"
    | "connected"
    | "showTokenSelection"
  > {}

// all props except for requestedLendType
interface RepayBoxProps
  extends Pick<
    RepayCollatBoxProps,
    | "nativeSolBalance"
    | "connected"
    | "marginfiClient"
    | "selectedAccount"
    | "banks"
    | "requestedDepositBank"
    | "requestedBorrowBank"
    | "accountSummaryArg"
    | "onComplete"
    | "captureEvent"
    | "showAvailableCollateral"
  > {}

interface RequiredRepayBoxProps
  extends Pick<
    RepayBoxProps,
    "onComplete" | "captureEvent" | "requestedDepositBank" | "requestedBorrowBank" | "connected"
  > {}

interface RequiredLoopBoxProps
  extends Pick<LoopBoxProps, "onComplete" | "captureEvent" | "requestedBank" | "walletContextState" | "connected"> {}

interface RequiredStakeBoxProps
  extends Pick<StakeBoxProps, "captureEvent" | "onConnect" | "connected" | "requestedActionType" | "onComplete"> {}

interface RequiredDepositSwapBoxProps
  extends Pick<
    DepositSwapBoxProps,
    "onComplete" | "captureEvent" | "connected" | "showTokenSelection" | "requestedDepositBank"
  > {}

interface ActionBoxComponent extends React.FC<ActionBoxProps & ActionBoxComponentProps> {
  Lend: React.FC<ActionBoxProps & { lendProps: LendBoxProps | RequiredLendBoxProps; useProvider?: boolean }>;
  BorrowLend: React.FC<ActionBoxProps & { lendProps: LendBoxProps | RequiredLendBoxProps; useProvider?: boolean }>;
  Repay: React.FC<ActionBoxProps & { repayProps: RepayBoxProps | RequiredRepayBoxProps; useProvider?: boolean }>;
  Loop: React.FC<ActionBoxProps & { loopProps: LoopBoxProps | RequiredLoopBoxProps; useProvider?: boolean }>;
  Stake: React.FC<ActionBoxProps & { stakeProps: StakeBoxProps | RequiredStakeBoxProps; useProvider?: boolean }>;
  DepositSwap: React.FC<
    ActionBoxProps & { depositSwapProps: DepositSwapBoxProps | RequiredDepositSwapBoxProps; useProvider?: boolean }
  >;
}

export type {
  ActionBoxProps,
  ActionBoxComponent,
  RequiredLendBoxProps,
  RepayBoxProps,
  RequiredRepayBoxProps,
  RequiredLoopBoxProps,
  RequiredStakeBoxProps,
  RequiredDepositSwapBoxProps,
};
export { isDialogWrapperProps };
