import { FC } from "react";
import { Spinner } from "../Spinner";

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
    <div className="w-full h-full bg-black text-white rounded-lg shadow-lg z-50">
      <h2 className="text-lg font-semibold">{title}</h2>
        <div className="py-3">
          {steps.map((step, index) => (
            <div key={index}>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold">{step.label}</h3>
                {step.status === "success" ? (
                  <svg
                    className=" h-5 w-5 text-green-500"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : step.status === "error" ? (
                  <svg
                    className=" h-5 w-5 text-red-500"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                ) : step.status === "pending" ? (
                  <Spinner />
                ) : (
                  <svg
                    className=" h-5 w-5 text-gray-500"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
              </div>
              {step.message && <p className="mt-2 p-1 text-sm border-2 border-rose-500 rounded-md bg-rose-500/25">{step.message}</p>}
            </div>
          ))}
        </div>
    </div>
  );
};
