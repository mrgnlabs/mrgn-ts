import React from "react";

import { toastManager } from "@mrgnlabs/mrgn-toasts";

export default function TestPage() {
  return (
    <>
      <button onClick={() => toastManager.showWarningToast("Warning", "This is a warning toast")}>
        Show Warning Toast
      </button>
      <button
        onClick={() =>
          toastManager.showErrorToast("Error", "This is an error toast", "This is an error description", 123)
        }
      >
        Show Error Toast
      </button>
      <button
        onClick={() =>
          toastManager.createMultiStepToast("This is a multi-step toast", [
            { label: "Step 1", status: "pending" },
            { label: "Step 2", status: "success" },
            { label: "Step 3", status: "error" },
          ])
        }
      >
        Show Multi-Step Toast
      </button>
    </>
  );
}
