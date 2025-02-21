"use client";

import { Toaster, ToasterProps } from "sonner";

export function ToastProvider(props: ToasterProps) {
  return (
    <Toaster
      toastOptions={{
        className: "bg-mfi-toast-background h-auto",
        classNames: {
          closeButton: "bg-mfi-toast-background -right-5 left-auto w-6 h-6",
        },
      }}
      position="bottom-left"
      theme="dark"
      closeButton
      {...props}
    />
  );
}
