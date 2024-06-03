import React from "react";

import { cn } from "~/utils";

import { Bridge } from "~/components/common/Bridge";
import { Loader } from "~/components/ui/loader";

export default function BridgePage() {
  const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <>
      <div className="w-full h-full flex flex-col justify-start items-center content-start gap-8">
        <Bridge
          onLoad={() => {
            setIsLoaded(true);
          }}
        />
        {!isLoaded && <Loader label="Loading Mayan bridge..." className="mt-8" />}
        <div className={cn("max-w-[420px] transition-opacity", !isLoaded && "opacity-0")} id="swap_widget" />
      </div>
    </>
  );
}
