import React from "react";
import Link from "next/link";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

import { JupiterScreenProps, OnrampScreenProps } from "~/utils";
import { useMrgnlendStore } from "~/store";
import { IconCheck, IconExternalLink } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

import { ScreenWrapper } from "../../sharedComponents";
import { TransferCompletePayload } from "@meso-network/meso-js";

interface props extends OnrampScreenProps {}

export const SuccessScreen = ({ onNext, setSuccessProps, successProps }: props) => {
  return (
    <ScreenWrapper>
      {successProps?.mesoSuccess ? (
        <MesoSuccessScreen {...successProps?.mesoSuccess} />
      ) : (
        successProps?.jupiterSuccess && <JupiterSuccessScreen {...successProps?.jupiterSuccess} />
      )}

      <div className="w-full">
        <Button
          className="w-full"
          onClick={() => {
            setSuccessProps({ jupiterSuccess: successProps?.jupiterSuccess });
            onNext();
          }}
        >
          Next
        </Button>
      </div>
    </ScreenWrapper>
  );
};

const MesoSuccessScreen = ({ transfer }: TransferCompletePayload) => {
  return (
    <div>
      <div className="rounded-full p-2 bg-background-gray w-fit h-fit mx-auto">
        <IconCheck width={42} height={42} />
      </div>
      <p className="text-center">
        You&apos;ve successfully bought SOL!
        <br /> Press next to make your first swap.
      </p>

      <dl className="flex justify-center mt-4 ">
        {transfer?.networkTransactionId ? (
          <>
            <Link
              href={`https://solscan.io/tx/${transfer.networkTransactionId}`}
              className="flex items-center gap-1.5 text-chartreuse text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortenAddress(transfer.networkTransactionId || "")}{" "}
              <IconExternalLink size={15} className="-translate-y-[1px]" />
            </Link>
          </>
        ) : (
          <></>
        )}
      </dl>
    </div>
  );
};

const JupiterSuccessScreen = ({ txid, swapResult, quoteResponseMeta }: JupiterScreenProps) => {
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
