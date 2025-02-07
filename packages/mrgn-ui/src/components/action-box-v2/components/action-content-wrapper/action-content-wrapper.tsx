import React from "react";
import { cn } from "@mrgnlabs/mrgn-utils";

type ActionBoxContentWrapperProps = {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
};

export const ActionBoxContentWrapper: React.FC<ActionBoxContentWrapperProps> = ({ children, className, maxHeight }) => {
  return (
    <div
      className={cn("relative flex flex-col", className)}
      style={{
        maxHeight: maxHeight || "none",
      }}
    >
      {children}
    </div>
  );
};
