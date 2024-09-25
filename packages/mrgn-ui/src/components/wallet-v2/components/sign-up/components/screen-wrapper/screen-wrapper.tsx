import React from "react";

import { cn } from "~/utils/theme-utils";

interface props {
  children: React.ReactNode;
  noBackground?: boolean;
}

export const ScreenWrapper = ({ children, noBackground = false }: props) => {
  return (
    <div className="w-full overflow-scroll space-y-6">
      <div
        className={cn(
          "flex flex-col gap-6 relative text-muted-foreground transition-all duration-300 w-full p-4 rounded-lg max-h-none",
          !noBackground && "bg-background-gray",
          noBackground && "bg-background-gray"
        )}
      >
        {children}
      </div>
    </div>
  );
};
