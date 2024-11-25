import { IconLoader2, IconCheck, IconAlertTriangle } from "@tabler/icons-react";
import { cn } from "./themeUtils";
import React from "react";

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
}

export const MultiStepToast = ({ title, steps, retry }: MultiStepToastProps) => {
  return (
    <div className="w-full h-full rounded-md z-50 bg-background text-foreground">
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="pb-3 pt-6 space-y-2">
        {steps.map((step, index) => {
          return (
            <div className="text-muted-foreground" key={index}>
              <div className="flex items-start space-x-2">
                {Array.isArray(step.label) ? (
                  <ul className="list-disc ml-0">
                    {step.label.map((label, idx) => (
                      <li key={idx} className="flex items-center space-x-2 w-max">
                        {step.status === "success" && <IconCheck size={18} className="text-green-400 flex-shrink-0" />}
                        {step.status === "error" && (
                          <IconAlertTriangle size={18} className="text-red-400 flex-shrink-0" />
                        )}
                        {step.status === "pending" && <IconLoader2 size={18} className="animate-spin flex-shrink-0" />}
                        <span
                          className={cn(
                            step.status === "canceled" && "line-through",
                            step.status === "success" && "text-green-400",
                            step.status === "error" && "text-red-400"
                          )}
                        >
                          {label}
                        </span>
                        {step.status === "error" && (
                          <button
                            onClick={retry}
                            className="relative inline-flex gap-2 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-600 bg-accent text-primary px-4 py-2 shadow-sm hover:bg-accent/80"
                          >
                            Retry
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
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
                    {step.status === "error" && (
                      <button
                        onClick={retry}
                        className="ml-2 relative inline-flex gap-2 items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-600 bg-accent text-primary px-4 py-2 shadow-sm hover:bg-accent/80"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
              {/* Handle message as a string or component */}
              {step.message && (
                <div className="py-3 px-4 rounded-xl mt-2.5 text-muted-foreground">
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
