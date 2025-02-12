import { toast } from "sonner";
import { WarningToast } from "../components/toasts/warning-toast";
import { ErrorToast } from "../components/toasts/error-toast";
import { MultiStepToast } from "../components/toasts/multi-step-toast/multi-step-toast";

export interface ToastStep {
  label: string;
  status: "todo" | "pending" | "success" | "error" | "canceled" | "paused";
  message?: string;
  signature?: string;
  explorerUrl?: string;
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

  createMultiStepToast(title: string, steps: ToastStep[]) {
    let toastId: string | number | undefined = undefined;

    const updateToast = () => {
      if (toastId) {
        toast(<MultiStepToast toastId={toastId.toString()} title={title} steps={steps} />, {
          id: toastId,
          duration: Infinity,
        });
      }
    };

    const ToastController = {
      start: () => {
        if (!toastId) {
          toastId = toast(<MultiStepToast toastId={title} title={title} steps={steps} />, {
            id: title,
            duration: Infinity,
          });
        }
      },

      successAndNext: (explorerUrl?: string, signature?: string) => {
        const currentIndex = steps.findIndex((s) => s.status === "pending");
        if (currentIndex === -1) return;

        steps[currentIndex] = { ...steps[currentIndex], status: "success", explorerUrl, signature };

        if (currentIndex < steps.length - 1) {
          steps[currentIndex + 1].status = "pending";
        }

        updateToast();
      },

      success: (explorerUrl?: string, signature?: string) => {
        steps = steps.map((s, index) => ({
          ...s,
          status: "success",
          explorerUrl: index === steps.length - 1 ? explorerUrl : undefined,
          signature: index === steps.length - 1 ? signature : undefined,
        }));

        updateToast();

        setTimeout(() => {
          if (toastId) toast.dismiss(toastId);
        }, 5000);
      },

      setFailed: (message?: string, retry?: () => void) => {
        const currentIndex = steps.findIndex((s) => s.status === "pending");
        if (currentIndex === -1) return;

        steps[currentIndex] = { ...steps[currentIndex], status: "error", message };

        updateToast();
      },

      pause: () => {
        const currentIndex = steps.findIndex((s) => s.status === "pending");
        if (currentIndex !== -1) {
          steps[currentIndex].status = "paused";
        }

        updateToast();
      },

      resume: () => {
        const currentIndex = steps.findIndex((s) => s.status === "paused");
        if (currentIndex !== -1) {
          steps[currentIndex].status = "pending";
        }

        updateToast();
      },

      resetAndStart: () => {
        steps = steps.map((step, index) => ({
          ...step,
          status: index === 0 ? "pending" : "todo",
          message: undefined,
        }));

        updateToast();
      },

      close: () => {
        if (toastId) {
          toast.dismiss(toastId);
          toastId = undefined;
        }
      },
    };

    return ToastController;
  }
}

// Singleton toastManager instance
export const toastManager = new ToastManager();
