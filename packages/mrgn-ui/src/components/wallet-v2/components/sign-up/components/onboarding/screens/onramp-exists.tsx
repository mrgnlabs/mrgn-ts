import React from "react";
import { useRouter } from "next/router";

import { OnrampScreenProps } from "~/components/wallet-v2/components/sign-up/sign-up.utils";
import { Button } from "~/components/ui/button";

import { ScreenWrapper, WalletSeperator } from "~/components/wallet-v2/components/sign-up/components";

interface props extends OnrampScreenProps {}

export const OnrampAlreadyExists = ({ onNext, onClose, successProps }: props) => {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <div className="w-full flex flex-col gap-6 p-2">
        <p>
          It appears you already have a marginfi account. Click below to view your account or continue the onramp
          process.
        </p>
        <Button
          className="w-full"
          onClick={() => {
            onClose();
            router.push("/portfolio");
          }}
        >
          View account
        </Button>
        <WalletSeperator description="continue onramp" onClick={() => onNext()} />
      </div>
    </ScreenWrapper>
  );
};
