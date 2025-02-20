import React from "react";
import { toastManager } from "@mrgnlabs/mrgn-toasts";
export default function TestPage() {
  return (
    <>
      <button
        onClick={() =>
          toastManager.showErrorToast("DIt is een hele lange error message om te testen of de toast manager werkt")
        }
      >
        error
      </button>

      <button
        onClick={() => {
          const toast = toastManager.createMultiStepToast("xxx", [
            { label: "Sign transaction" },
            { label: "Configure token account" },
            { label: "Repay 102030USDC using 0.0001 SOL" },
          ]);
          toast.start();
          toast.successAndNext();
          toast.setFailed("API Bundle failed: bundle contains an expired blockhash", () => {
            console.log("retry");
          });
        }}
      >
        error
      </button>
    </>
  );
}
