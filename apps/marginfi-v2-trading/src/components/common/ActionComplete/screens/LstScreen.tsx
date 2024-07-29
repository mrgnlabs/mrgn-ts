import React from "react";

import Link from "next/link";
import Image from "next/image";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { PublicKey } from "@solana/web3.js";

import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatterDyn, shortenAddress } from "@mrgnlabs/mrgn-common";

import { useLstStore, useMrgnlendStore } from "~/store";
import { getTokenImageURL } from "~/utils";
import { IconExternalLink } from "~/components/ui/icons";

interface Props {
  amount: number;
  bank: ActiveBankInfo;
  type: ActionType;
  txn: string;
  quote?: QuoteResponseMeta;
}

export const LstScreen = ({ amount, bank, type, quote, txn }: Props) => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const [lstData] = useLstStore((state) => [state.lstData]);
  const lstBank = React.useMemo(() => {
    const filtered = extendedBankInfos.filter((bank) =>
      bank.address.equals(new PublicKey("DMoqjmsuoru986HgfjqrKEvPv8YBufvBGADHUonkadC5"))
    );
    return filtered.length > 0 ? filtered[0] : null;
  }, [extendedBankInfos]);

  if (!quote || !lstBank || !lstData) {
    return <></>;
  }

  return (
    <>
      <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-4xl font-medium">{Number(quote.quoteResponse.outAmount.toString()) / 10 ** 9} LST</h3>
          <Image
            className="rounded-full w-9 h-9"
            src={getTokenImageURL(lstBank.info.state.mint.toBase58())}
            alt={(lstBank.meta.tokenSymbol || "Token") + "  logo"}
            width={36}
            height={36}
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
        <dt>Staked</dt>
        <dd className="text-right">
          {amount} {bank.meta.tokenSymbol}
        </dd>
        {lstBank && (
          <>
            <dt>Total {lstBank.meta.tokenSymbol}</dt>
            <dd className="text-right">
              {lstBank.userInfo.tokenAccount.balance} {lstBank.meta.tokenSymbol}
            </dd>
          </>
        )}
        <dt>APY</dt>
        <dd className="text-right text-success">{percentFormatterDyn.format(lstData.projectedApy)}</dd>
        <dt>Transaction</dt>
        <dd className="text-right">
          <Link
            href={`https://solscan.io/tx/${txn}`}
            className="flex items-center justify-end gap-1.5 text-chartreuse text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            {shortenAddress(txn || "")} <IconExternalLink size={15} className="-translate-y-[1px]" />
          </Link>
        </dd>
      </dl>
    </>
  );
};
