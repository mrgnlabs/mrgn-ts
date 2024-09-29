import { LendBoxProps, RepayCollatBoxProps } from "~/components/action-box-v2/actions";
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
    | "onConnect"
    | "requestedBank"
    | "requestedLendType"
    | "walletContextState"
    | "connected"
  > {}

interface RequiredBorrowLendBoxProps
  extends Pick<
    BorrowLendBoxProps,
    "onComplete" | "captureEvent" | "onConnect" | "requestedBank" | "walletContextState" | "connected"
  > {}

// all props except for requestedLendType
interface BorrowLendBoxProps
  extends Pick<
    LendBoxProps,
    | "nativeSolBalance"
    | "walletContextState"
    | "connected"
    | "marginfiClient"
    | "selectedAccount"
    | "banks"
    | "requestedBank"
    | "accountSummaryArg"
    | "onConnect"
    | "onComplete"
    | "captureEvent"
  > {}

interface RepayBoxProps extends BorrowLendBoxProps {}

interface RequiredRepayBoxProps
  extends Pick<
    BorrowLendBoxProps,
    "onComplete" | "captureEvent" | "onConnect" | "requestedBank" | "walletContextState" | "connected"
  > {}

interface ActionBoxComponent extends React.FC<ActionBoxProps & ActionBoxComponentProps> {
  Lend: React.FC<ActionBoxProps & { lendProps: LendBoxProps | RequiredLendBoxProps; useProvider?: boolean }>;
  BorrowLend: React.FC<
    ActionBoxProps & { lendProps: BorrowLendBoxProps | RequiredBorrowLendBoxProps; useProvider?: boolean }
  >;
  Repay: React.FC<ActionBoxProps & { repayProps: RepayBoxProps | RequiredRepayBoxProps; useProvider?: boolean }>;
}

export type {
  ActionBoxProps,
  ActionBoxComponent,
  BorrowLendBoxProps,
  RequiredBorrowLendBoxProps,
  RequiredLendBoxProps,
  RepayBoxProps,
  RequiredRepayBoxProps,
};
export { isDialogWrapperProps };
