import { FC } from "react";
import { IconAlertTriangle } from "~/components/ui/icons";

export interface WarningToastProps {
  title: string;
  message: string;
}

export const WarningToast: FC<WarningToastProps> = ({ title, message }) => {
  return (
    <div className="w-full h-full bg-black text-white rounded-lg shadow-lg z-50">
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="pb-3 pt-6 space-y-2">
        <div className="flex items-start space-x-2 py-3 px-4 rounded-xl text-warning bg-destructive">
          <p>{message}</p>
          <IconAlertTriangle className="shrink-0" size={18} />
        </div>
      </div>
    </div>
  );
};
