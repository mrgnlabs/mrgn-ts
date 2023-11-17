import { FC } from "react";
import { IconAlertTriangle } from "~/components/ui/icons";

export interface ErrorToastProps {
  title: string;
  message: string;
}

export const ErrorToast: FC<ErrorToastProps> = ({ title, message }) => {
  return (
    <div className="w-full h-full bg-black text-white rounded-lg shadow-lg z-50 p-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="py-3 text-sm">
        <div className="flex items-center space-x-2">
          <p className="text-red-400">{message}</p>
          <IconAlertTriangle size={18} className="text-red-400" />
        </div>
      </div>
    </div>
  );
};
