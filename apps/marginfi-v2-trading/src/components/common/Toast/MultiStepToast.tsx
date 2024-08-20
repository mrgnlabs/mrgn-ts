import { IconLoader2, IconCheck, IconAlertTriangle } from "@tabler/icons-react";

import { cn } from "~/utils";

export interface MultiStepToastProps {
  title: string;
  steps: ToastStepWithStatus[];
}

export interface ToastStep {
  label: string;
}

export type ToastStatus = "todo" | "pending" | "success" | "error" | "canceled";

export interface ToastStepWithStatus extends ToastStep {
  status: ToastStatus;
  message?: string;
}

export const MultiStepToast = ({ title, steps }: MultiStepToastProps) => {
  return (
    <div className="w-full h-full rounded-xl text-primary z-50">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="pb-3 pt-6 space-y-2">
        {steps.map((step, index) => {
          return (
            <div
              className={cn(
                "text-primary",
                (step.status === "todo" || step.status === "canceled") && "text-muted-foreground",
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
