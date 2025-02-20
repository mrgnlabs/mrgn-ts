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

/*
Singleton class that manages all toasts.
*/
const toastManager = {
  showWarningToast: (title: string, message: string) => {
    toast(<WarningToast title={title} message={message} />, { duration: Infinity });
  },

  showErrorToast: (props: string | any) => {
    // TODO: this should be actionMessageType
    let description: string;
    let code: number | undefined;
    if (typeof props === "string") {
      description = props;
      code = undefined;
    } else {
      description = props.description || "";
      code = props.code;
    }

    toast(<ErrorToast title={"Error"} description={description} code={code} />, {
      duration: Infinity,
    });
  },

  // Function to create a multi-step toast.
  // Returns a controller object that can be used to update the toast.
  createMultiStepToast: (title: string, steps: { label: string }[]): MultiStepToastController => {
    // Generate a unique ID for the toast. This is used to identify the toast in the DOM & cannot be the same as another instance.
    const toastId: string = Math.random().toString(36).substring(2, 9);

    // Create MultiStepToastStep objects for each step.
    let stepsWithStatus: MultiStepToastStep[] = steps.map((step, index) => ({
      ...step,
      status: index === 0 ? ToastStatus.PENDING : ToastStatus.TODO,
    }));

    // Create the toast.
    toast(<MultiStepToast toastId={toastId} title={title} steps={stepsWithStatus} />, {
      id: toastId,
      duration: Infinity,
    });

    // Function to update the toast.
    const updateToast = () => {
      toast(<MultiStepToast toastId={toastId} title={title} steps={stepsWithStatus} />, {
        id: toastId,
        duration: Infinity,
      });
    };

    // Create a controller object that can be used to update the toast.
    const ToastController: MultiStepToastController = {
      start: () => {
        updateToast();
      },

      // Function to update the toast to the next step.
      // If stepsToAdvance is not provided, it will default to 1.
      // If explorerUrl && signature are provided, the explorerUrl will be displayed in the toast.
      successAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => {
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

          setTimeout(() => toast.dismiss(toastId), 7500);
        } else {
          for (let i = currentIndex + 1; i <= nextStepIndex; i++) {
            if (stepsWithStatus[i]) {
              stepsWithStatus[i].status = ToastStatus.PENDING;
            }
          }

          updateToast();
        }
      },

      // Function to set all steps to success.
      // If explorerUrl && signature are provided, the explorerUrl will be displayed in the toast.
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

      // Function to set all current steps in PENDING state to ERROR.
      // If message && onRetry are provided, the message will be displayed in the toast & the onRetry function will be called.
      setFailed: (message?: string, onRetry?: () => void) => {
        stepsWithStatus = stepsWithStatus.map((step) => {
          if (step.status === ToastStatus.PENDING) {
            return {
              ...step,
              status: ToastStatus.ERROR,
              message,
              onRetry,
            };
          }
          return step;
        });

        updateToast();
      },

      // Function to pause the toast at the current step.
      pause: () => {
        const currentIndex = stepsWithStatus.findIndex((s) => s.status === ToastStatus.PENDING);
        if (currentIndex !== -1) {
          stepsWithStatus[currentIndex].status = ToastStatus.PAUSED;
        }

        updateToast();
      },

      // Function to resume the toast from the paused step.
      resume: () => {
        const currentIndex = stepsWithStatus.findIndex((s) => s.status === ToastStatus.PAUSED);
        if (currentIndex !== -1) {
          stepsWithStatus[currentIndex].status = ToastStatus.PENDING;
        }

        updateToast();
      },

      // Function to reset the last failed step & start the toast from that step.
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
  },
};

// Exporting singleton instance
export { toastManager };
