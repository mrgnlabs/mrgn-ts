import { IconAlertTriangle } from "@tabler/icons-react";
import { cn } from "./themeUtils";

export interface ErrorToastProps {
  title: string;
  message: string;
}

export function ErrorToast({ title, message }: ErrorToastProps) {
  return (
    <div className="w-full h-full z-50 bg-background rounded-md shadow-lg">
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="pb-3 pt-6 space-y-2">
        <div className="flex items-start space-x-2 py-3 px-4 rounded-xl text-destructive-foreground bg-destructive">
          <p>{message}</p>
          <IconAlertTriangle className="shrink-0" size={18} />
        </div>
      </div>
    </div>
  );
}
