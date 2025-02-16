"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return <Toaster toastOptions={{
    className: "bg-mfi-toast-background",
  }} position="bottom-right" theme="dark" />;
}
