import { toast } from "sonner";
import { WarningToast } from "../components/toasts/warning-toast";
import { ErrorToast } from "../components/toasts/error-toast";
import { MultiStepToast } from "../components/toasts/multi-step-toast";

export interface ToastStepV2 {
  label: string;
  status: "pending" | "success" | "error" | "canceled" | "todo" | "paused";
  message?: string;
}

class ToastManager {
  showWarningToast(title: string, message: string) {
    toast(<WarningToast title={title} message={message} />, { duration: 3000 });
  }

  showErrorToast(title: string, message: string, description?: string, code?: number) {
    toast(<ErrorToast title={title} message={message} description={description} code={code} />, {
      duration: 5000,
    });
  }

  createMultiStepToast(title: string, steps: ToastStepV2[], onClose?: () => void) {
    return new MultiStepToastHandle(title, steps, onClose);
  }
}

// Singleton instance
export const toastManager = new ToastManager();

export class MultiStepToastHandle {
  private _title: string;
  private _stepIndex: number;
  private _stepsWithStatus: ToastStepV2[];
  private _toastId: string | number | undefined = undefined;
  private _onClose?: () => void;

  constructor(title: string, steps: ToastStepV2[], onClose?: () => void) {
    this._title = title;
    this._stepIndex = 0;
    this._stepsWithStatus = steps.map((step, index) => ({
      ...step,
      status: index === 0 ? "pending" : "todo",
    }));
    this._onClose = onClose;
  }

  start() {
    this._toastId = toast(<MultiStepToast title={this._title} steps={this._stepsWithStatus} />, {
      duration: Infinity,
      closeButton: false,
    });
  }

  close() {
    if (this._toastId) {
      toast.dismiss(this._toastId);
      this._toastId = undefined;
    }
  }

  pause() {
    if (!this._toastId || !this._stepsWithStatus[this._stepIndex]) return;
    this._stepsWithStatus[this._stepIndex].status = "paused";
    this.recreateToast();
  }

  resume() {
    if (!this._toastId || !this._stepsWithStatus[this._stepIndex]) return;
    this._stepsWithStatus[this._stepIndex].status = "pending";
    this.recreateToast();
  }

  setSuccessAndNext(stepsToAdvance: number = 1) {
    if (!this._toastId) return;

    this._stepsWithStatus[this._stepIndex].status = "success";

    const nextStepIndex = this._stepIndex + stepsToAdvance;
    if (nextStepIndex >= this._stepsWithStatus.length) {
      for (let i = this._stepIndex + 1; i < this._stepsWithStatus.length; i++) {
        this._stepsWithStatus[i].status = "success";
      }
      this.recreateToast(6000);
    } else {
      for (let i = this._stepIndex + 1; i <= nextStepIndex; i++) {
        if (this._stepsWithStatus[i]) {
          this._stepsWithStatus[i].status = "pending";
        }
      }
      this._stepIndex = nextStepIndex;
      this.recreateToast();
    }
  }

  setSuccess() {
    if (!this._toastId) return;
    this._stepsWithStatus.forEach((step) => (step.status = "success"));
    this.recreateToast(6000);
  }

  setFailed(message: string, retry?: () => void) {
    if (!this._toastId) return;

    this._stepsWithStatus[this._stepIndex].status = "error";
    this._stepsWithStatus[this._stepIndex].message = message;

    for (let i = this._stepIndex + 1; i < this._stepsWithStatus.length; i++) {
      this._stepsWithStatus[i].status = "canceled";
    }

    this.recreateToast(Infinity, retry);
  }

  resetAndStart() {
    if (!this._toastId) return;

    if (this._stepsWithStatus[this._stepIndex].status === "error") {
      this._stepsWithStatus[this._stepIndex].status = "pending";
      this._stepsWithStatus[this._stepIndex].message = undefined;
    }

    for (let i = this._stepIndex + 1; i < this._stepsWithStatus.length; i++) {
      this._stepsWithStatus[i].status = "todo";
      this._stepsWithStatus[i].message = undefined;
    }

    this.recreateToast();
  }

  private recreateToast(duration: number = Infinity, retry?: () => void) {
    if (!this._toastId) return;

    toast.dismiss(this._toastId); // Remove existing toast

    this._toastId = toast(<MultiStepToast title={this._title} steps={this._stepsWithStatus} retry={retry} />, {
      duration,
      closeButton: false,
    });
  }
}
