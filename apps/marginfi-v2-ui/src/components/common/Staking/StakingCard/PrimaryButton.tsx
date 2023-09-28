import React, { FC, ReactNode } from "react";

// Put this in common folder in the future when all is merged

interface PrimaryButtonProps {
  children?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export const PrimaryButton: FC<PrimaryButtonProps> = ({ children, disabled, loading, onClick }) => (
  <a onClick={disabled ? undefined : onClick}>
    <div
      className={`w-full h-full flex flex-row justify-center items-center capitalize rounded-[3px] font-aeonik font-normal z-10 ${
        loading
          ? "wavy-gradient-bg text-black"
          : disabled
          ? "bg-[#808080] text-black"
          : "bg-[#e3e3e3] hover:bg-[#ccc] text-black cursor-pointer"
      }
      `}
    >
      {children}
    </div>
  </a>
);
