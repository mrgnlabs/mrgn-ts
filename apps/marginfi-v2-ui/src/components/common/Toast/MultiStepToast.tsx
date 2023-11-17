import { FC } from "react";
import { IconLoader, IconCheck, IconAlertTriangle, IconClockHour4 } from "~/components/ui/icons";

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

export const MultiStepToast: FC<MultiStepToastProps> = ({ title, steps }) => {
  return (
    <div className="w-full h-full bg-black text-white rounded-lg shadow-lg z-50 p-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="py-3 text-sm space-y-2">
        {steps.map((step, index) => (
          <div key={index}>
            <div className="flex items-center space-x-2">
              <h3>{step.label}</h3>
              {step.status === "success" ? (
                <IconCheck size={18} className="text-green-400" />
              ) : step.status === "error" ? (
                <IconAlertTriangle size={18} className="text-red-400" />
              ) : step.status === "pending" ? (
                <IconLoader size={18} />
              ) : (
                <IconClockHour4 size={18} />
              )}
            </div>
            {step.message && <p className="text-red-400 mt-1">{step.message}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
