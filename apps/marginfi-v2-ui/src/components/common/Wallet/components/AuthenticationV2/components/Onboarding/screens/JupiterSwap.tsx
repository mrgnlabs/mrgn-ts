import React from "react";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { Swap } from "~/components/common/Swap";
import { OnrampScreenProps, cn } from "~/utils";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";
import { Loader } from "~/components/ui/loader";
import { USDC_MINT } from "@bonfida/spl-name-service";

interface props extends OnrampScreenProps {}

export const JupiterSwap = ({ onNext, setSuccessProps }: props) => {
  const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <ScreenWrapper>
      <div className="flex justify-center">
        <Swap
          initialInputMint={WSOL_MINT}
          initialOutputMint={USDC_MINT}
          onLoad={() => {
            setIsLoaded(true);
          }}
          onSuccess={(props) => {
            setSuccessProps({ jupiterSuccess: props });
          }}
        />
        <div className="h-full flex flex-col justify-start items-center content-start gap-8 w-4/5">
          {!isLoaded && <Loader label="Loading Jupiter swap..." className="mt-8" />}
          <div
            className={cn("max-w-[420px] px-3 transition-opacity", !isLoaded && "opacity-0")}
            id="integrated-terminal"
          />
        </div>
      </div>
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};
