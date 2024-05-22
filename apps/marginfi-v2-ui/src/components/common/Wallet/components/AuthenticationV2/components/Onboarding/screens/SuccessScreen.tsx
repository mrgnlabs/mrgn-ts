import React from "react";
import Confetti from "react-confetti";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { OnrampScreenProps } from "~/utils";
import { ActionBox } from "~/components/common/ActionBox";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";
import { useWindowSize } from "@uidotdev/usehooks";
import { QuoteResponseMeta, SwapResult } from "@jup-ag/react-hook";
import Link from "next/link";
import { percentFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { IconExternalLink } from "~/components/ui/icons";

interface props extends OnrampScreenProps {}

export const SuccessScreen = ({ onNext, successProps }: props) => {
  const { width, height } = useWindowSize();

  return (
    <ScreenWrapper>
      <Confetti width={width!} height={height! * 2} recycle={false} opacity={0.4} className="z-[80]" />
      {successProps?.jupiterSuccess && <JupiterSuccessScreen {...successProps?.jupiterSuccess} />}
    </ScreenWrapper>
  );
};

interface jupiterScreenProps {
  txid: string;
  swapResult: SwapResult;
  quoteResponseMeta: QuoteResponseMeta | null;
}

const JupiterSuccessScreen = ({ txid, swapResult, quoteResponseMeta }: jupiterScreenProps) => {
  const isError = "error" in swapResult;

  if ("error" in swapResult) {
    return <></>;
  } else if ("inputAmount" in swapResult) {
    return (
      <div>
        <div className="text-primary text-center">
          <p>Swapped {swapResult.inputAmount} to</p>
          <div className="text-xl">{swapResult.outputAmount}</div>
        </div>
        <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
          <dt>Price Impact</dt>
          <dd className="text-right">
            {quoteResponseMeta && percentFormatter.format(Number(quoteResponseMeta.quoteResponse.priceImpactPct))}
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
