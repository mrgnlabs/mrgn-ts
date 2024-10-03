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

// all props except for requestedLendType
interface RepayBoxProps
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

interface RequiredRepayBoxProps
  extends Pick<
    RepayBoxProps,
    "onComplete" | "captureEvent" | "onConnect" | "requestedBank" | "walletContextState" | "connected"
  > {}

interface ActionBoxComponent extends React.FC<ActionBoxProps & ActionBoxComponentProps> {
  Lend: React.FC<ActionBoxProps & { lendProps: LendBoxProps | RequiredLendBoxProps; useProvider?: boolean }>;
  BorrowLend: React.FC<ActionBoxProps & { lendProps: LendBoxProps | RequiredLendBoxProps; useProvider?: boolean }>;
  Repay: React.FC<ActionBoxProps & { repayProps: RepayBoxProps | RequiredRepayBoxProps; useProvider?: boolean }>;
}

export type { ActionBoxProps, ActionBoxComponent, RequiredLendBoxProps, RepayBoxProps, RequiredRepayBoxProps };
export { isDialogWrapperProps };
