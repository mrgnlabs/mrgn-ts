import React from "react";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { USDC_MINT } from "@bonfida/spl-name-service";

import { Swap } from "~/components/swap";
import { OnrampScreenProps } from "~/components/wallet-v2/components/sign-up/sign-up.utils";

import { cn } from "@mrgnlabs/mrgn-utils";

import { ScreenWrapper, WalletSeperator } from "~/components/wallet-v2/components/sign-up/components";
import { Loader } from "~/components/ui/loader";

interface props extends OnrampScreenProps {}

export const JupiterSwap = ({ onNext, setSuccessProps }: OnrampScreenProps) => {
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
        <div className="h-full flex flex-col justify-start items-center content-start gap-8 w-full">
          {!isLoaded && <Loader label="Loading Jupiter swap..." className="mt-8" />}
          <div className={cn("w-full transition-opacity", !isLoaded && "opacity-0")} id="integrated-terminal" />
        </div>
      </div>
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};
