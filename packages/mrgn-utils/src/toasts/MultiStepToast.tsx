import { IconLoader2, IconCheck, IconAlertTriangle } from "@tabler/icons-react";

import { cn } from "./themeUtils";

export interface MultiStepToastProps {
  title: string;
  steps: ToastStepWithStatus[];
}

export interface ToastStep {
  label: string | string[];
}

export type ToastStatus = "todo" | "pending" | "success" | "error" | "canceled";

export interface ToastStepWithStatus extends ToastStep {
  status: ToastStatus;
  message?: string;
}

export const MultiStepToast = ({ title, steps }: MultiStepToastProps) => {
  return (
    <div className="w-full h-full rounded-md z-50 bg-background text-foreground">
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="pb-3 pt-6 space-y-2">
        {steps.map((step, index) => {
          return (
            <div className="text-muted-foreground" key={index}>
              <div className="flex items-center space-x-2">
                {steps.length > 1 && <h3>{`${index + 1}.`}</h3>}
                {Array.isArray(step.label) ? (
                  <ul className="list-disc ml-0">
                    {step.label.map((label, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
                        <span className={cn(step.status === "canceled" && "line-through")}>{label}</span>
                        {step.status === "success" && <IconCheck size={18} className="text-green-400 flex-shrink-0" />}
                        {step.status === "error" && (
                          <IconAlertTriangle size={18} className="text-red-400 flex-shrink-0" />
                        )}
                        {step.status === "pending" && <IconLoader2 size={18} className="animate-spin flex-shrink-0" />}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className={cn(step.status === "canceled" && "line-through")}>{step.label}</span>
                    {step.status === "success" && <IconCheck size={18} className="text-green-400" />}
                    {step.status === "error" && <IconAlertTriangle size={18} className="text-red-400" />}
                    {step.status === "pending" && <IconLoader2 size={18} className="animate-spin" />}
                  </div>
                )}
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
