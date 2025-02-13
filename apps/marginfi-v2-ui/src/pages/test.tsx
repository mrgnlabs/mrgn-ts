import React from "react";

import { toastManager } from "@mrgnlabs/mrgn-toasts";
import { MultiStepToastHandle, showErrorToast } from "@mrgnlabs/mrgn-utils";

// Temp test page for refactored toasts testing
export default function TestPage() {
  const handleStartProcess = () => {
    const toast = toastManager.createMultiStepToast("Processing Transaction", [
      { label: "Initiating" },
      { label: "Signing" },
      { label: "Broadcasting"},
      { label: "Confirming" },
    ]);

    toast.start();

    setTimeout(() => {
      console.log("Pausing...");
      toast.pause();
    }, 2000);

    setTimeout(() => {
      console.log("Resuming...");
      toast.resume();
    }, 4000);

    setTimeout(() => {
      console.log("Success and moving to next step...");
      toast.successAndNext();
    }, 6000);

    setTimeout(() => {
      console.log("Setting step to failed...");
      toast.setFailed("Transaction failed, please try again.", () => {
        console.log("Retrying...");
        toast.resetAndStart();
      });
    }, 8000);

    setTimeout(() => {
      console.log("Retrying transaction...");
      toast.resetAndStart();
    }, 10000);

    setTimeout(() => {
      console.log("Completing transaction...");
      toast.success();
    }, 12000);
  };

  return (
    <>
      <button onClick={() => toastManager.showWarningToast("Warning", "This is a warning toast")}>
        Show Warning Toast
      </button>
      <button onClick={() => toastManager.showErrorToast("Error", "This is an error description", 123)}>
        Show Error Toast
      </button>

      <button
        onClick={() =>
          showErrorToast({
            actionMethod: "ERROR",
            isEnabled: false,
            description: "This is an error description",
            code: 123,
          })
        }
      >
        Show old error Toast
      </button>

      <button
        onClick={() => {
          const multiStepToast = new MultiStepToastHandle("Group Creation", [{ label: `Creating group` }]);

          multiStepToast.start();
          setTimeout(() => {
            multiStepToast.setFailed("Transaction failed, please try again.", () => {
              console.log("Retrying...");
            });
          }, 2000);
        }}
      >
        old multistep failed
      </button>
      <button onClick={() => handleStartProcess()}>Show Multi-Step Toast</button>
    </>
  );
}
