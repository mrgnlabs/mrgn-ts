import React from "react";
import { useWindowSize } from "@uidotdev/usehooks";
import { QuoteResponseMeta, SwapResult } from "@jup-ag/react-hook";
import Link from "next/link";
import { percentFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";

import { OnrampScreenProps } from "~/utils";
import { IconExternalLink } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

import { ScreenWrapper } from "../../sharedComponents";
import { Loader } from "~/components/ui/loader";

interface props extends OnrampScreenProps {}

export const OnrampAlreadyExists = ({ onNext, successProps }: props) => {
  return (
    <ScreenWrapper>
      <div className="w-full flex justify-center items-center">
        <div className="font-semibold text-2xl text-white leading-none">Margin account exists</div>
        <p className="text-sm leading-none sm:text-base">
          It looks like you&apos;ve already created a marginfi account. Click the button below to view your positions or
          skip to continue the onramp process.
        </p>
      </div>
    </ScreenWrapper>
  );
};
