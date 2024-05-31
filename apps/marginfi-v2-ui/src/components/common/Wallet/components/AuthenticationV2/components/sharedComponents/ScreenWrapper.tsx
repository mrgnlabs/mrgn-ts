import React from "react";

interface props {
  children: React.ReactNode;
}

export const ScreenWrapper = ({ children }: props) => {
  return (
    <div className="w-full overflow-scroll space-y-6">
      <div className="flex flex-col gap-6 relative bg-muted text-muted-foreground transition-all duration-300 w-full p-4 rounded-lg max-h-none">
        {children}
      </div>
    </div>
  );
};
