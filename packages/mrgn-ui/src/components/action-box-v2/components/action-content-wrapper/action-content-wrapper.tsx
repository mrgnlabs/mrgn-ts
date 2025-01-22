import React from "react";
import { cn } from "@mrgnlabs/mrgn-utils";

type ActionBoxContentWrapperProps = {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string; // Customizable max height, defaults to 85vh
};

export const ActionBoxContentWrapper: React.FC<ActionBoxContentWrapperProps> = ({
  children,
  className,
  maxHeight = "75vh",
}) => {
  return (
    <div
      className={cn("relative flex flex-col overflow-y-auto", className)}
      style={{
        maxHeight: maxHeight, // Ensures the height is capped
      }}
    >
      {children}
    </div>
  );
};
