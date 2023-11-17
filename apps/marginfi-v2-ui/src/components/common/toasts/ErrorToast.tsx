import { FC } from "react";

export interface ErrorToastProps {
  title: string;
  message: string;
}

export const ErrorToast: FC<ErrorToastProps> = ({ title, message }) => {
  return (
    <div className="w-full h-full bg-black text-white rounded-lg shadow-lg z-50">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="py-3">
        <div className="flex items-center space-x-2">
          <p className="mt-2 p-1 text-sm border-2 border-rose-500 rounded-md bg-rose-500/25">{message}</p>
          <svg
            className=" h-5 w-5 text-red-500"
            fill="none"
            height="24"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
      </div>
    </div>
  );
};
