import React from "react";
import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { QuoteResponseMeta, SwapResult } from "@jup-ag/react-hook";
import Link from "next/link";
import { percentFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";

import { OnrampScreenProps } from "~/utils";
import { IconExternalLink } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

import { ScreenWrapper } from "../../sharedComponents";

interface props extends OnrampScreenProps {}

export const SuccessScreen = ({ onNext, successProps }: props) => {
  const { width, height } = useWindowSize();

  return (
    <ScreenWrapper>
      <Confetti width={width!} height={height! * 2} recycle={false} opacity={0.4} className="z-[80]" />
      {successProps?.jupiterSuccess && <JupiterSuccessScreen {...successProps?.jupiterSuccess} />}

      <div className="w-full">
        <Button className="w-full" onClick={() => onNext()}>
          Next
        </Button>
      </div>
    </ScreenWrapper>
  );
};

interface jupiterScreenProps {
  txid: string;
  swapResult: SwapResult;
  quoteResponseMeta: QuoteResponseMeta | null;
}

const JupiterSuccessScreen = ({ txid, swapResult, quoteResponseMeta }: jupiterScreenProps) => {
  if ("inputAmount" in swapResult) {
    return (
      <div>
        <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
          <dt>Swapped</dt>
          <dd className="text-right">{swapResult.inputAmount}</dd>
          <dt>Received</dt>
          <dd className="text-right">{swapResult.outputAmount}</dd>
          <dt>Price Impact</dt>
          <dd className="text-right">
            {quoteResponseMeta && percentFormatter.format(Number(quoteResponseMeta.quoteResponse.priceImpactPct) * 100)}
          </dd>
          <dt>Transaction</dt>
          <dd className="text-right">
            <Link
              href={`https://solscan.io/tx/${swapResult?.txid}`}
              className="flex items-center justify-end gap-1.5 text-chartreuse text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortenAddress(swapResult?.txid || "")} <IconExternalLink size={15} className="-translate-y-[1px]" />
            </Link>
          </dd>
        </dl>
      </div>
    );
  } else {
    return <></>;
  }
};
