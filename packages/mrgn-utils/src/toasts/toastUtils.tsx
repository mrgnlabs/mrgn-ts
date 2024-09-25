import { Id, toast } from "react-toastify";
import { MultiStepToast, ToastStep, ToastStepWithStatus } from "./MultiStepToast";
import { ErrorToast } from "./ErrorToast";
import { WarningToast } from "./WarningToast";

export class MultiStepToastHandle {
  private _title: string;
  private _stepIndex: number;
  private _stepsWithStatus: ToastStepWithStatus[];
  private _toastId: Id | undefined = undefined;
  private _theme: "light" | "dark" = "dark";

  constructor(title: string, steps: ToastStep[], theme?: "light" | "dark") {
    this._title = title;
    this._stepIndex = 0;
    this._theme = theme || "dark";
    this._stepsWithStatus = steps.map((step, index) => {
      if (index === 0) {
        return { ...step, status: "pending" };
      }

      return { ...step, status: "todo" };
    });
  }

  start() {
    this._toastId = toast(
      () => <MultiStepToast title={this._title} steps={this._stepsWithStatus} theme={this._theme} />,
      {
        hideProgressBar: true,
        autoClose: false,
        style: {
          width: "100%",
          height: "100%",
          bottom: "12px",
        },
        className: `rounded-xl pt-3 pb-2 px-3.5 ${this._theme === "dark" ? "bg-black" : "bg-background"}`,
      }
    );
  }

  setSuccessAndNext() {
    if (!this._toastId) return;

    if (this._stepIndex >= this._stepsWithStatus.length - 1) {
      this._stepsWithStatus[this._stepIndex].status = "success";
      toast.update(this._toastId, {
        render: () => <MultiStepToast title={this._title} steps={this._stepsWithStatus} theme={this._theme} />,
        autoClose: 2000,
      });
    } else {
      this._stepsWithStatus[this._stepIndex].status = "success";
      this._stepIndex++;
      this._stepsWithStatus[this._stepIndex].status = "pending";
      toast.update(this._toastId, {
        render: () => <MultiStepToast title={this._title} steps={this._stepsWithStatus} theme={this._theme} />,
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
      render: () => <MultiStepToast title={this._title} steps={this._stepsWithStatus} theme={this._theme} />,
      autoClose: false,
    });
  }
}

export function showErrorToast(msgOrOptions: string | { message: string; theme?: "light" | "dark" }) {
  let msg: string;
  let theme: "light" | "dark";
  if (typeof msgOrOptions === "string") {
    msg = msgOrOptions;
    theme = "dark";
  } else {
    msg = msgOrOptions.message;
    theme = msgOrOptions.theme || "dark";
  }

  toast(() => <ErrorToast title={"Error"} message={msg} theme={theme} />, {
    hideProgressBar: true,
    autoClose: 3000,
    style: {
      width: "100%",
      height: "100%",
    },
    className: `p-4 bottom-4 rounded-xl ${theme === "light" ? "bg-background" : "bg-black"}`,
  });
}

export function showWarningToast(msgOrOptions: string | { message: string; theme?: "light" | "dark" }) {
  let msg: string;
  let theme: "light" | "dark";
  if (typeof msgOrOptions === "string") {
    msg = msgOrOptions;
    theme = "dark";
  } else {
    msg = msgOrOptions.message;
    theme = msgOrOptions.theme || "dark";
  }

  toast(() => <WarningToast title={"Warning"} message={msg} theme={theme} />, {
    hideProgressBar: true,
    autoClose: 2000,
    style: {
      width: "100%",
      height: "100%",
    },
    className: `p-4 bottom-4 rounded-xl ${theme === "light" ? "bg-background" : "bg-black"}`,
  });
}
