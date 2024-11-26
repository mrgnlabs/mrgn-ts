import { IconLoader2, IconCheck, IconAlertTriangle, IconExternalLink } from "@tabler/icons-react";
import { cn } from "./themeUtils";
import React from "react";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

export interface MultiStepToastProps {
  title: string;
  steps: ToastStepWithStatus[];
  retry?: () => void;
}

export interface ToastStep {
  label: string | string[];
}

export type ToastStatus = "todo" | "pending" | "success" | "error" | "canceled";

export interface ToastStepWithStatus extends ToastStep {
  status: ToastStatus;
  message?: string | React.ReactNode;
  signature?: string;
  explorerUrl?: string;
}

export const MultiStepToast = ({ title, steps, retry }: MultiStepToastProps) => {
  const lastFailedIndex = steps.map((step) => step.status).lastIndexOf("error");

  return (
    <div className="w-full h-full rounded-md z-50 bg-background text-foreground">
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="pb-3 pt-6 space-y-2">
        {steps.map((step, index) => {
          const isLastFailed = index === lastFailedIndex;
          console.log(step.explorerUrl);
          return (
            <div className="text-muted-foreground" key={index}>
              <div className="flex items-start space-x-2">
                <div className="flex items-center space-x-2 w-max">
                  {step.status === "success" && <IconCheck size={18} className="text-green-400 flex-shrink-0" />}
                  {step.status === "error" && <IconAlertTriangle size={18} className="text-red-400 flex-shrink-0" />}
                  {step.status === "pending" && <IconLoader2 size={18} className="animate-spin flex-shrink-0" />}
                  <span
                    className={cn(
                      step.status === "canceled" && "line-through",
                      step.status === "success" && "text-green-400",
                      step.status === "error" && "text-red-400"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.status === "error" && isLastFailed && (
                    <button
                      onClick={retry}
                      className="ml-2 relative inline-flex gap-2 items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-600 bg-accent text-primary px-4 py-2 shadow-sm hover:bg-accent/80"
                    >
                      Retry
                    </button>
                  )}
                  {step.signature && step.explorerUrl && (
                    <a
                      href={step.explorerUrl}
                      className="flex items-center justify-end gap-1.5 text-primary text-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="border-b border-border">{shortenAddress(step.signature)}</span>{" "}
                      <IconExternalLink size={15} className="-translate-y-[1px]" />
                    </a>
                  )}
                </div>
              </div>
              {step.message && (
                <div className="py-3 px-6 mt-2.5 text-xs max-w-xs text-muted-foreground">
                  {typeof step.message === "string" ? <p>{step.message}</p> : step.message}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
