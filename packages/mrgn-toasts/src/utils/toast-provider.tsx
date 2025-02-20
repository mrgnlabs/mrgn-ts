"use client";

import { Toaster, ToasterProps } from "sonner";

export function ToastProvider(props: ToasterProps) {
  return (
    <Toaster
      toastOptions={{
        className: "bg-mfi-toast-background h-auto",
        classNames: {
          closeButton: "bg-mfi-toast-background -right-4 left-auto",
        },
      }}
      position="bottom-left"
      theme="dark"
      closeButton
      {...props}
    />
  );
}
