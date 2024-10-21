import { IconLoader2, IconCheck, IconAlertTriangle } from "@tabler/icons-react";

import { cn } from "./themeUtils";

export interface MultiStepToastProps {
  title: string;
  steps: ToastStepWithStatus[];
  theme?: "light" | "dark";
}

export interface ToastStep {
  label: string | string[];
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
              <div className="flex items-start space-x-2">
                <h3 className="pt-0.5">{steps.length > 1 && <>{`${index + 1}.`}</>}</h3>
                {Array.isArray(step.label) ? (
                  <ul className="list-disc list-inside">
                    {step.label.map((label, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
                        <span>{label}</span>
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
                    <span>{step.label}</span>
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
