import { PublicKey } from "@solana/web3.js";
import {
  LendBoxProps,
  LoopBoxProps,
  StakeBoxProps,
  DepositSwapBoxProps,
  RepayBoxProps,
} from "~/components/action-box-v2/actions";
import { ActionDialogProps } from "~/components/action-box-v2/components";
import { AddPositionBoxProps } from "../actions/add-position-box";

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
interface RequiredRepayBoxProps
  extends Pick<
    RepayBoxProps,
    "onComplete" | "captureEvent" | "requestedBank" | "requestedSecondaryBank" | "connected"
  > {}

interface RequiredLoopBoxProps
  extends Pick<LoopBoxProps, "onComplete" | "captureEvent" | "requestedBank" | "connected"> {}

interface RequiredStakeBoxProps
  extends Pick<
    StakeBoxProps,
    "captureEvent" | "onConnect" | "connected" | "requestedActionType" | "onComplete" | "requestedBank"
  > {}

interface RequiredDepositSwapBoxProps
  extends Pick<
    DepositSwapBoxProps,
    "onComplete" | "captureEvent" | "connected" | "showTokenSelection" | "requestedDepositBank" | "walletTokens"
  > {}

interface RequiredAddPositionBoxProps
  extends Pick<
    AddPositionBoxProps,
    "onComplete" | "captureEvent" | "connected" | "depositBank" | "borrowBank" | "tradeSide" | "isDialog"
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
  AddPosition: React.FC<
    ActionBoxProps & { addPositionProps: AddPositionBoxProps | RequiredAddPositionBoxProps; useProvider?: boolean }
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
  RequiredAddPositionBoxProps,
};
export { isDialogWrapperProps };
