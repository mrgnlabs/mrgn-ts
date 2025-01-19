import React from "react";

import { cn } from "@mrgnlabs/mrgn-utils";

interface props {
  children: React.ReactNode;
}

export const ScreenWrapper = ({ children }: props) => {
  return (
    <div className="w-full overflow-scroll space-y-6">
      <div
        className={cn(
          "flex flex-col gap-6 relative text-muted-foreground transition-all duration-300 w-full p-4 rounded-lg max-h-none bg-mfi-action-box-background-dark"
        )}
      >
        {children}
      </div>
    </div>
  );
};
