import {
  IconLoader2,
  IconCheck,
  IconExternalLink,
  IconX,
  IconCircleCheckFilled,
  IconCircleXFilled,
} from "@tabler/icons-react";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { MultiStepToastStep } from "~/utils";

enum ToastStatus {
  TODO = "todo",
  PENDING = "pending",
  SUCCESS = "success",
  ERROR = "error",
  CANCELED = "canceled",
  PAUSED = "paused",
} // TODO: remove this and fix import

interface MultiStepToastProps {
  toastId: string;
  title: string;
  steps: MultiStepToastStep[];
}

export function MultiStepToast({ title, steps }: MultiStepToastProps) {
  const anyFailed = steps.some((s) => s.status === ToastStatus.ERROR);
  const lastFailedIndex = steps.map((s) => s.status).lastIndexOf(ToastStatus.ERROR);
  const allSuccessful = steps.every((step) => step.status === ToastStatus.SUCCESS);

  return (
    <div className="relative w-full h-full rounded-md z-50 md:max-w-[340px] font-light pr-4">
      <h2 className="flex items-center gap-1.5 text-lg mb-5 font-normal">
        {allSuccessful ? (
          <>
            <IconCircleCheckFilled className="text-success flex-shrink-0" />
            Transaction confirmed
          </>
        ) : anyFailed ? (
          <span className="text-mrgn-error">Transaction failed</span>
        ) : (
          title
        )}
      </h2>
      <div className="flex flex-col gap-2">
        {steps.map((step, index) => (
          <StepComponent
            key={index}
            step={step}
            isLastFailed={index === lastFailedIndex}
            isLastStep={index === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// Step Rendering
function StepComponent({
  step,
  isLastFailed,
  isLastStep,
}: {
  step: MultiStepToastStep;
  isLastFailed: boolean;
  isLastStep: boolean;
}) {
  switch (step.status) {
    case "success":
      return (
        <SuccessStep
          label={step.label}
          signature={step.signature}
          explorerUrl={step.explorerUrl}
          isLastStep={isLastStep}
        />
      );
    case "error":
      return <ErrorStep label={step.label} message={step.message} onRetry={step.onRetry} isLastFailed={isLastFailed} />;
    case "pending":
      return <PendingStep label={step.label} />;
    case "canceled":
      return <CanceledStep label={step.label} />;
    case "todo":
      return <TodoStep label={step.label} />;
    case "paused":
      return <PausedStep label={step.label} />;
    default:
      return null;
  }
}

// Step components
const SuccessStep = ({
  label,
  signature,
  explorerUrl,
  isLastStep,
}: {
  label: string;
  signature?: string;
  explorerUrl?: string;
  isLastStep: boolean;
}) => (
  <div className="flex flex-col">
    <div className="flex items-center space-x-2">
      <IconCheck size={16} className="text-success flex-shrink-0" />
      <span className="text-primary truncate">{label}</span>
      {!isLastStep && signature && explorerUrl && (
        <a
          href={explorerUrl}
          className="text-xs text-blue-500 flex items-center text-muted-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconExternalLink size={12} />
          <span className="text-xs truncate"> {shortenAddress(signature)}</span>
        </a>
      )}
    </div>
    {isLastStep && signature && explorerUrl && (
      <div className="flex justify-between space-x-2 w-full px-6 py-1">
        <a
          href={explorerUrl}
          className="text-xs text-blue-500 flex items-center text-muted-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconExternalLink size={12} />
          <span className="text-xs truncate"> {shortenAddress(signature)}</span>
        </a>
      </div>
    )}
  </div>
);

const ErrorStep = ({
  label,
  message,
  onRetry,
  isLastFailed,
}: {
  label: string;
  message?: string;
  onRetry?: () => void;
  isLastFailed: boolean;
}) => (
  <div className="flex flex-col">
    <div className="flex items-center space-x-2">
      <IconX size={16} className="flex-shrink-0 text-mrgn-error" />
      <span>{label}</span>
    </div>
    <div className="flex items-center space-x-2 w-full pl-6">
      {isLastFailed && message && <div className="py-1 text-xs text-muted-foreground flex-1 min-w-0">{message}</div>}
      {isLastFailed && onRetry && (
        <button
          className="w-16 flex-shrink-0 h-max py-2 inline-flex gap-2 items-center justify-center text-[10px] font-medium rounded-md bg-accent text-primary px-2 py-0.5 shadow-sm hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-600"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

const PendingStep = ({ label }: { label: string }) => (
  <div className="flex items-start space-x-2">
    <IconLoader2 size={16} className="animate-spin flex-shrink-0 relative top-0.5" />
    <span>{label}</span>
  </div>
);

const CanceledStep = ({ label }: { label: string }) => (
  <div className="flex items-center space-x-2">
    <IconX size={16} className="text-muted-foreground/50 flex-shrink-0" />
    <span className="text-muted-foreground">{label}</span>
  </div>
);

const TodoStep = ({ label }: { label: string }) => <span className="ml-6 text-muted-foreground">{label}</span>;

const PausedStep = ({ label }: { label: string }) => <span className="ml-6 text-muted-foreground">{label}</span>;
