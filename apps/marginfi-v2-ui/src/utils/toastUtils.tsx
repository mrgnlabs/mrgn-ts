import { Id, toast } from "react-toastify";
import { ToastStep, ToastStepWithStatus, MultiStepToast, ErrorToast } from "~/components/common/Toast";

export class MultiStepToastHandle {
  private _title: string;
  private _stepIndex: number;
  private _stepsWithStatus: ToastStepWithStatus[];
  private _toastId: Id | undefined = undefined;

  constructor(title: string, steps: ToastStep[]) {
    this._title = title;
    this._stepIndex = 0;
    this._stepsWithStatus = steps.map((step, index) => {
      if (index === 0) {
        return { ...step, status: "pending" };
      }

      return { ...step, status: "todo" };
    });
  }

  start() {
    this._toastId = toast(() => <MultiStepToast title={this._title} steps={this._stepsWithStatus} />, {
      hideProgressBar: true,
      autoClose: false,
      style: {
        width: "100%",
        height: "100%",
      },
      className: "bg-black",
    });
  }

  setSuccessAndNext() {
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

  setFailed(message: string) {
    if (!this._toastId) return;
    this._stepsWithStatus[this._stepIndex].status = "error";
    this._stepsWithStatus[this._stepIndex].message = message;
    for (let i = this._stepIndex + 1; i < this._stepsWithStatus.length; i++) {
      this._stepsWithStatus[i].status = "canceled";
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
    autoClose: 2000,
    style: {
      width: "100%",
      height: "100%",
    },
    className: "bg-black",
  });
}
