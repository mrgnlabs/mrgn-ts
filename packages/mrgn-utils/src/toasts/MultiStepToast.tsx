import { IconLoader2, IconCheck, IconAlertTriangle } from "@tabler/icons-react";

import { cn } from "./themeUtils";

export interface MultiStepToastProps {
  title: string;
  steps: ToastStepWithStatus[];
  theme?: "light" | "dark";
}

export interface ToastStep {
  label: string;
}

export type ToastStatus = "todo" | "pending" | "success" | "error" | "canceled";

export interface ToastStepWithStatus extends ToastStep {
  status: ToastStatus;
  message?: string;
}

export const MultiStepToast = ({ title, steps, theme = "dark" }: MultiStepToastProps) => {
  return (
    <div
      className={cn(
        "w-full h-full rounded-xl z-50",
        theme === "dark" && " bg-black text-white shadow-lg",
        theme === "light" && "text-primary"
      )}
    >
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="pb-3 pt-6 space-y-2">
        {steps.map((step, index) => {
          return (
            <div
              className={cn(
                theme === "dark" && "text-gray-400",
                theme === "light" && "text-primary",
                (step.status === "todo" || step.status === "canceled") &&
                  ((theme === "dark" && "text-gray-400/50") || (theme === "light" && "text-muted-foreground")),
                step.status === "canceled" && "line-through"
              )}
              key={index}
            >
              <div className="flex items-center space-x-2">
                <h3>
                  {steps.length > 0 && <>{index + 1}</>}. {step.label}
                </h3>
                {step.status === "success" && <IconCheck size={18} className="text-green-400" />}
                {step.status === "error" && <IconAlertTriangle size={18} className="text-red-400" />}
                {step.status === "pending" && <IconLoader2 size={18} className="animate-spin" />}
              </div>
              {step.message && (
                <p className="bg-destructive py-3 px-4 rounded-xl mt-2.5 text-destructive-foreground">{step.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
