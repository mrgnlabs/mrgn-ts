import { IconLoader2, IconCheck, IconExternalLink, IconX } from "@tabler/icons-react";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

export interface ToastStep {
  label: string;
  status: "todo" | "pending" | "success" | "error" | "canceled" | "paused";
  message?: string;
  signature?: string;
  explorerUrl?: string;
}

interface MultiStepToastProps {
  toastId: string;
  title: string;
  steps: ToastStep[];
}

export function MultiStepToast({ title, steps }: MultiStepToastProps) {
  const lastFailedIndex = steps.map((s) => s.status).lastIndexOf("error");

  return (
    <div className="w-full h-full rounded-md z-50 md:min-w-[340px]">
      <h2 className="text-lg mb-5 font-medium">{title}</h2>
      <div className="flex flex-col gap-2">
        {steps.map((step, index) => (
          <StepComponent key={index} step={step} isLastFailed={index === lastFailedIndex} />
        ))}
      </div>
    </div>
  );
}

// Step Rendering
function StepComponent({ step, isLastFailed }: { step: ToastStep; isLastFailed: boolean }) {
  switch (step.status) {
    case "success":
      return <SuccessStep label={step.label} signature={step.signature} explorerUrl={step.explorerUrl} />;
    case "error":
      return <ErrorStep label={step.label} message={step.message} showRetry={isLastFailed} />;
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
}: {
  label: string;
  signature?: string;
  explorerUrl?: string;
}) => (
  <div className="flex items-center space-x-2">
    <IconCheck size={16} className="text-success flex-shrink-0" />
    <span className="text-primary">{label}</span>
    {signature && explorerUrl && (
      <a
        href={explorerUrl}
        className="text-xs text-blue-500 flex items-center"
        target="_blank"
        rel="noopener noreferrer"
      >
        <IconExternalLink size={12} />
        {shortenAddress(signature)}
      </a>
    )}
  </div>
);

const ErrorStep = ({ label, message, showRetry }: { label: string; message?: string; showRetry: boolean }) => (
  <div className="flex flex-col">
    <div className="flex items-center space-x-2">
      <IconX size={16} className="text-mrgn-error flex-shrink-0" />
      <span className="text-error">{label}</span>
      {showRetry && (
        <button className="ml-2 inline-flex gap-2 items-center justify-center text-[10px] font-medium rounded-md bg-accent text-primary px-2 py-0.5 shadow-sm hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-600">
          Retry
        </button>
      )}
    </div>
    {message && <div className="py-1 text-xs text-muted-foreground">{message}</div>}
  </div>
);

const PendingStep = ({ label }: { label: string }) => (
  <div className="flex items-center space-x-2">
    <IconLoader2 size={16} className="animate-spin flex-shrink-0" />
    <span className="text-yellow-500">{label}</span>
  </div>
);

const CanceledStep = ({ label }: { label: string }) => (
  <div className="flex items-center space-x-2">
    <IconX size={16} className="text-muted-foreground/50 flex-shrink-0" />
    <span className="text-muted-foreground">{label}</span>
  </div>
);

const TodoStep = ({ label }: { label: string }) => <span className="ml-6 text-muted-foreground/50">{label}</span>;

const PausedStep = ({ label }: { label: string }) => <span className="ml-6 text-muted-foreground/50">{label}</span>;
