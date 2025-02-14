import { toast } from "sonner";
import { WarningToast } from "../components/toasts/warning-toast";
import { ErrorToast } from "../components/toasts/error-toast";
import { MultiStepToast } from "../components/toasts/multi-step-toast/multi-step-toast";

export enum ToastStatus {
  TODO = "todo",
  PENDING = "pending",
  SUCCESS = "success",
  ERROR = "error",
  CANCELED = "canceled",
  PAUSED = "paused",
}

export interface MultiStepToastStep {
  label: string;
  status: ToastStatus;
  message?: string;
  signature?: string;
  explorerUrl?: string;
  onRetry?: () => void;
}

export interface MultiStepToastController {
  start: () => void;
  successAndNext: (stepsToAdvance?: number | undefined, explorerUrl?: string, signature?: string) => void;
  success: (explorerUrl?: string, signature?: string) => void;
  setFailed: (message?: string, onRetry?: () => void) => void;
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
      status: index === 0 ? ToastStatus.PENDING : ToastStatus.TODO,
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

      successAndNext: (stepsToAdvance: number | undefined , explorerUrl?: string, signature?: string) => {
  if (!toastId) return;

  const currentIndex = stepsWithStatus.findIndex((s) => s.status === ToastStatus.PENDING);
  if (currentIndex === -1) return;

  stepsWithStatus[currentIndex] = {
    ...stepsWithStatus[currentIndex],
    status: ToastStatus.SUCCESS,
    explorerUrl,
    signature,
  };

  const advanceSteps = stepsToAdvance ?? 1;
  const nextStepIndex = currentIndex + advanceSteps;

  if (nextStepIndex >= stepsWithStatus.length) {
    for (let i = currentIndex + 1; i < stepsWithStatus.length; i++) {
      stepsWithStatus[i].status = ToastStatus.SUCCESS;
    }

    updateToast();

    setTimeout(() => toast.dismiss(toastId), 5000);
  } else {
    for (let i = currentIndex + 1; i <= nextStepIndex; i++) {
      if (stepsWithStatus[i]) {
        stepsWithStatus[i].status = ToastStatus.PENDING;
      }
    }

    updateToast();
  }
},

      success: (explorerUrl?: string, signature?: string) => {
        stepsWithStatus.forEach((s, index) => {
          s.status = ToastStatus.SUCCESS;
          if (index === stepsWithStatus.length - 1) {
            s.explorerUrl = explorerUrl;
            s.signature = signature;
          }
        });

        updateToast();

        setTimeout(() => toast.dismiss(toastId), 5000);
      },

      setFailed: (message?: string, onRetry?: () => void) => {
        const currentIndex = stepsWithStatus.findIndex((s) => s.status === ToastStatus.PENDING);
        if (currentIndex === -1) return;

        stepsWithStatus[currentIndex] = {
          ...stepsWithStatus[currentIndex],
          status: ToastStatus.ERROR,
          message,
          onRetry,
        };

        updateToast();
      },

      pause: () => {
        const currentIndex = stepsWithStatus.findIndex((s) => s.status === ToastStatus.PENDING);
        if (currentIndex !== -1) {
          stepsWithStatus[currentIndex].status = ToastStatus.PAUSED;
        }

        updateToast();
      },

      resume: () => {
        const currentIndex = stepsWithStatus.findIndex((s) => s.status === ToastStatus.PAUSED);
        if (currentIndex !== -1) {
          stepsWithStatus[currentIndex].status = ToastStatus.PENDING;
        }

        updateToast();
      },

      resetAndStart: () => {
        const failedIndex = stepsWithStatus.findIndex((s) => s.status === ToastStatus.ERROR);

        if (failedIndex !== -1) {
          stepsWithStatus[failedIndex].status = ToastStatus.PENDING;
          stepsWithStatus.slice(failedIndex + 1).forEach((step) => {
            step.status = ToastStatus.TODO;
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
