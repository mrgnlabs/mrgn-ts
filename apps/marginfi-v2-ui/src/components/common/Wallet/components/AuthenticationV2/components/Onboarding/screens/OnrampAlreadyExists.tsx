import React from "react";
import { useWindowSize } from "@uidotdev/usehooks";
import { QuoteResponseMeta, SwapResult } from "@jup-ag/react-hook";
import Link from "next/link";
import { percentFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";

import { OnrampScreenProps } from "~/utils";
import { IconExternalLink } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";
import { Loader } from "~/components/ui/loader";
import { useRouter } from "next/router";

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
