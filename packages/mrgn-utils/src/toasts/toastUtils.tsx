import { Id, toast } from "react-toastify";
import { MultiStepToast, ToastStep, ToastStepWithStatus } from "./MultiStepToast";
import { ErrorToast } from "./ErrorToast";
import { WarningToast } from "./WarningToast";

export class MultiStepToastHandle {
  private _title: string;
  private _stepIndex: number;
  private _stepsWithStatus: ToastStepWithStatus[];
  private _toastId: Id | undefined = undefined;
  private _onClose?: () => void;

  constructor(title: string, steps: ToastStep[], onClose?: () => void) {
    this._title = title;
    this._stepIndex = 0;
    this._stepsWithStatus = steps.map((step, index) => {
      if (index === 0) {
        return { ...step, status: "pending" };
      }

      return { ...step, status: "todo" };
    });
    this._onClose = onClose;
  }

  start() {
    this._toastId = toast(() => <MultiStepToast title={this._title} steps={this._stepsWithStatus} />, {
      hideProgressBar: true,
      autoClose: false,
      style: {
        width: "100%",
        height: "100%",
        bottom: "12px",
      },
      closeOnClick: false,
      className: "bg-background rounded-md pt-3 pb-2 px-3.5",
    });

    toast.onChange((toastInfo) => {
      if (toastInfo.id === this._toastId && toastInfo.status === "removed") {
        if (this._onClose) this._onClose();
      }
    });
  }

  setSuccessAndNext(signature?: string) {
    // TODO: handle signature to display in toast
    if (!this._toastId) return;

    if (this._stepIndex >= this._stepsWithStatus.length - 1) {
      this._stepsWithStatus[this._stepIndex].status = "success";
      toast.update(this._toastId, {
        render: () => <MultiStepToast title={this._title} steps={this._stepsWithStatus} />,
        autoClose: 2000,
      });
    } else {
      this._stepsWithStatus[this._stepIndex].status = "success";
      this._stepIndex++;
      this._stepsWithStatus[this._stepIndex].status = "pending";
      toast.update(this._toastId, {
        render: () => <MultiStepToast title={this._title} steps={this._stepsWithStatus} />,
        autoClose: false,
      });
    }
  }

  setSuccess() {
    if (!this._toastId) return;

    for (let i = 0; i < this._stepsWithStatus.length; i++) {
      if (this._stepsWithStatus[i]) {
        this._stepsWithStatus[i].status = "success";
      }
    }
    toast.update(this._toastId, {
      render: () => <MultiStepToast title={this._title} steps={this._stepsWithStatus} />,
      autoClose: false,
    });
  }

  setFailed(message: string | React.ReactNode, retry?: () => void) {
    if (!this._toastId) return;

    this._stepsWithStatus[this._stepIndex].status = "error";
    this._stepsWithStatus[this._stepIndex].message = message;

    for (let i = this._stepIndex + 1; i < this._stepsWithStatus.length; i++) {
      this._stepsWithStatus[i].status = "canceled";
    }

    toast.update(this._toastId, {
      render: () => <MultiStepToast title={this._title} steps={this._stepsWithStatus} retry={retry} />,
      autoClose: false,
    });
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

    toast.update(this._toastId, {
      render: () => <MultiStepToast title={this._title} steps={this._stepsWithStatus} />,
      autoClose: false,
    });
  }
}

export function showErrorToast(msgOrOptions: string | { message: string }) {
  let msg: string;
  if (typeof msgOrOptions === "string") {
    msg = msgOrOptions;
  } else {
    msg = msgOrOptions.message;
  }

  toast(() => <ErrorToast title={"Error"} message={msg} />, {
    hideProgressBar: true,
    autoClose: 3000,
    style: {
      width: "100%",
      height: "100%",
    },
    className: "p-4 bottom-4 rounded-md bg-background",
  });
}

export function showWarningToast(msgOrOptions: string | { message: string }) {
  let msg: string;
  if (typeof msgOrOptions === "string") {
    msg = msgOrOptions;
  } else {
    msg = msgOrOptions.message;
  }

  toast(() => <WarningToast title={"Warning"} message={msg} />, {
    hideProgressBar: true,
    autoClose: 2000,
    style: {
      width: "100%",
      height: "100%",
    },
    className: "p-4 bottom-4 rounded-md bg-background",
  });
}
