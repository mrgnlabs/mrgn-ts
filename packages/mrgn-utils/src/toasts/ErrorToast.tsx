import { IconAlertTriangle } from "@tabler/icons-react";
import { cn } from "./themeUtils";

export interface ErrorToastProps {
  title: string;
  message: string;
  theme?: "light" | "dark";
}

export function ErrorToast({ title, message, theme = "dark" }: ErrorToastProps) {
  return (
    <div
      className={cn(
        "w-full h-full z-50",
        theme === "light" && "text-primary",
        theme === "dark" && "bg-black text-white rounded-lg shadow-lg"
      )}
    >
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
