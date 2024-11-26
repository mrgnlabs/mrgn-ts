import { IconLoader2, IconCheck, IconExternalLink, IconX } from "@tabler/icons-react";
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
    <div className="w-full h-full rounded-md z-50 md:min-w-[340px]">
      <h2 className="text-lg mb-4 font-medium">{title}</h2>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isLastFailed = index === lastFailedIndex;
          return (
            <div className="text-muted-foreground text-sm" key={index}>
              <div className="flex items-start space-x-2">
                <div className="flex items-center space-x-2 w-max">
                  {step.status === "success" && <IconCheck size={16} className="text-success flex-shrink-0" />}
                  {(step.status === "error" || step.status === "canceled") && (
                    <IconX size={16} className={cn("flex-shrink-0", step.status === "error" && "text-mrgn-error")} />
                  )}
                  {(step.status === "pending" || step.status === "todo") && (
                    <IconLoader2 size={16} className="animate-spin flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      step.status === "success" && "text-mrgn-success",
                      step.status === "error" && "text-error"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.status === "error" && isLastFailed && (
                    <button
                      onClick={retry}
                      className="ml-2 relative inline-flex gap-2 items-center justify-center whitespace-nowrap rounded-md text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-600 bg-accent text-primary px-2 py-0.5 shadow-sm hover:bg-accent/80"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
              {step.signature && step.explorerUrl && (
                <div className="py-1.5 px-6 text-xs max-w-xs text-primary">
                  <a
                    href={step.explorerUrl}
                    className="flex items-center gap-1 text-[10px]"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IconExternalLink size={12} className="-translate-y-[1px]" />
                    <span className="border-b border-border">{shortenAddress(step.signature)}</span>{" "}
                  </a>
                </div>
              )}
              {step.message && (
                <div className="py-3 px-6 text-xs max-w-xs text-muted-foreground">
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
