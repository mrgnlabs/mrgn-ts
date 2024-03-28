"use client";

import React from "react";

import { cn } from "~/utils";

import { Swap } from "~/components/common/Swap";
import { Loader } from "~/components/ui/loader";

export default function SwapPage() {
  const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <>
      <Swap
        onLoad={() => {
          setIsLoaded(true);
        }}
      />
      <div className="h-full flex flex-col justify-start items-center content-start gap-8 w-4/5">
        {!isLoaded && <Loader label="Loading Jupiter swap..." className="mt-8" />}
        <div
          className={cn("max-w-[420px] px-3 transition-opacity", !isLoaded && "opacity-0")}
          id="integrated-terminal"
        ></div>
      </div>
    </>
  );
}
