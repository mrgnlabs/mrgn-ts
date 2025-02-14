import { toast } from "sonner";
import { WarningToast } from "../components/toasts/warning-toast";
import { ErrorToast } from "../components/toasts/error-toast";
import { MultiStepToast } from "../components/toasts/multi-step-toast/multi-step-toast";

export interface MultiStepToastStep {
  label: string;
  status: "todo" | "pending" | "success" | "error" | "canceled" | "paused";
  message?: string;
  signature?: string;
  explorerUrl?: string;
  retry?: () => void;
}

export interface MultiStepToastController {
  start: () => void;
  successAndNext: (explorerUrl?: string, signature?: string) => void;
  success: (explorerUrl?: string, signature?: string) => void;
  setFailed: (message?: string, retry?: () => void) => void;
  pause: () => void;
  resume: () => void;
  resetAndStart: () => void;
  close: () => void;
}

class ToastManager {
  showWarningToast(title: string, message: string) {
    toast(<WarningToast title={title} message={message} />, { duration: Infinity });
  }

  showErrorToast(title: string, description: string, code?: number) {
    toast(<ErrorToast title={title} description={description} code={code} />, {
      duration: Infinity,
    });
  }

  createMultiStepToast(title: string, steps: { label: string }[]): MultiStepToastController {
    const toastId: string = Math.random().toString(36).substring(2, 9);

    const stepsWithStatus: MultiStepToastStep[] = steps.map((step, index) => ({
      ...step,
      status: index === 0 ? "pending" : "todo",
    }));

    toast(<MultiStepToast toastId={toastId} title={title} steps={stepsWithStatus} />, {
      id: toastId,
      duration: Infinity,
    });

    const updateToast = () => {
      toast(<MultiStepToast toastId={toastId} title={title} steps={stepsWithStatus} />, {
        id: toastId,
        duration: Infinity,
      });
    };

    const ToastController: MultiStepToastController = {
      start: () => {
        updateToast(); 
      },

      successAndNext: (explorerUrl?: string, signature?: string) => {
        const currentIndex = stepsWithStatus.findIndex((s) => s.status === "pending");
        if (currentIndex === -1) return;

        stepsWithStatus[currentIndex] = { ...stepsWithStatus[currentIndex], status: "success", explorerUrl, signature };

        if (currentIndex < stepsWithStatus.length - 1) {
          stepsWithStatus[currentIndex + 1].status = "pending";
        }

        updateToast();
      },

      success: (explorerUrl?: string, signature?: string) => {
        stepsWithStatus.forEach((s, index) => {
          s.status = "success";
          if (index === stepsWithStatus.length - 1) {
            s.explorerUrl = explorerUrl;
            s.signature = signature;
          }
        });

        updateToast();

        setTimeout(() => toast.dismiss(toastId), 5000);
      },

      setFailed: (message?: string, retry?: () => void) => {
        const currentIndex = stepsWithStatus.findIndex((s) => s.status === "pending");
        if (currentIndex === -1) return;

        stepsWithStatus[currentIndex] = {
          ...stepsWithStatus[currentIndex],
          status: "error",
          message,
          retry,
        };

        updateToast();
      },

      pause: () => {
        const currentIndex = stepsWithStatus.findIndex((s) => s.status === "pending");
        if (currentIndex !== -1) {
          stepsWithStatus[currentIndex].status = "paused";
        }

        updateToast();
      },

      resume: () => {
        const currentIndex = stepsWithStatus.findIndex((s) => s.status === "paused");
        if (currentIndex !== -1) {
          stepsWithStatus[currentIndex].status = "pending";
        }

        updateToast();
      },

      resetAndStart: () => {
        const failedIndex = stepsWithStatus.findIndex((s) => s.status === "error");

        if (failedIndex !== -1) {
          stepsWithStatus[failedIndex].status = "pending";
          stepsWithStatus.slice(failedIndex + 1).forEach((step) => {
            step.status = "todo";
          });
        }

        updateToast();
      },

      close: () => toast.dismiss(toastId),
    };

    return ToastController;
  }
}

// Exporting singleton instance
export const toastManager = new ToastManager();
