import React from "react";
import { useWindowSize } from "@uidotdev/usehooks";
import { QuoteResponseMeta, SwapResult } from "@jup-ag/react-hook";
import Link from "next/link";
import { percentFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";

import { OnrampScreenProps } from "~/utils";
import { IconCheck, IconExternalLink } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

import { ScreenWrapper } from "../../sharedComponents";
import { useMrgnlendStore } from "~/store";

interface props extends OnrampScreenProps {}

export const SuccessScreen = ({ onNext, successProps }: props) => {
  const { width, height } = useWindowSize();

  return (
    <ScreenWrapper>
      {!successProps?.jupiterSuccess && <JupiterSuccessScreen {...(successProps?.jupiterSuccess as any)} />}

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
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const requestedBank = React.useMemo(() => {
    const mint = quoteResponseMeta?.quoteResponse.outputMint;
    if (mint) {
      const bank = extendedBankInfos.filter((bank) => bank.info.state.mint.equals(mint));
      if (bank.length !== 0) return bank[0];
    }
  }, [extendedBankInfos]);

  return (
    <div>
      <div className="rounded-full p-2 bg-background-gray w-fit h-fit mx-auto">
        <IconCheck width={42} height={42} />
      </div>
      <p className="text-center">
        You&apos;ve successfully swapped{requestedBank && ` ${requestedBank?.meta.tokenSymbol}`}.<br /> Press next to do
        your first deposit.
      </p>

      <dl className="flex justify-center mt-4 ">
        {swapResult && "txid" in swapResult ? (
          <>
            <Link
              href={`https://solscan.io/tx/${swapResult?.txid}`}
              className="flex items-center gap-1.5 text-chartreuse text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortenAddress(swapResult?.txid || "")} <IconExternalLink size={15} className="-translate-y-[1px]" />
            </Link>
          </>
        ) : (
          <></>
        )}
      </dl>
    </div>
  );
};
