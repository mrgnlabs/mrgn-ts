import { IconAlertTriangle } from "@tabler/icons-react";
import { cn } from "./themeUtils";

export interface WarningToastProps {
  title: string;
  message: string;
}

export const WarningToast = ({ title, message }: WarningToastProps) => {
  return (
    <div className="w-full h-full rounded-md z-50 md:min-w-[340px]">
      <h2 className="text-lg mb-5 font-medium">{title}</h2>
      <div className="flex items-center space-x-2 md:w-max">
        <IconAlertTriangle className="shrink-0 text-warning" size={18} />
        <span className="text-warning">{message}</span>
      </div>
    </div>
  );
};
