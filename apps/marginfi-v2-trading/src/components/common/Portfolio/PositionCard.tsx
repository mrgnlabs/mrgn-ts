import React from "react";

import Image from "next/image";
import Link from "next/link";

import { numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { getTokenImageURL } from "~/utils";
import { useTradeStore } from "~/store";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import { IconExternalLink } from "@tabler/icons-react";

type PositionCardProps = {
  bank: ActiveBankInfo;
};

export const PositionCard = ({ bank }: PositionCardProps) => {
  const [collateralBanks] = useTradeStore((state) => [state.collateralBanks]);

  const collateralBank = React.useMemo(() => {
    return collateralBanks[bank.address.toBase58()] || null;
  }, [collateralBanks, bank]);

  return (
    <div className="bg-background-gray p-4 rounded-2xl space-y-4">
      <div className="flex items-center gap-4 justify-between">
        <Link
          href={`/pools/${bank.address.toBase58()}`}
          className="flex items-center gap-4 font-medium text-muted-foreground"
        >
          <Image
            src={getTokenImageURL(bank.meta.tokenSymbol)}
            alt={bank.meta.tokenSymbol}
            width={56}
            height={56}
            className="rounded-full"
          />
          <div className="leading-none space-y-0.5">
            <h2 className="text-lg text-primary">{bank.meta.tokenName}</h2>
            <h3>{bank.meta.tokenSymbol}</h3>
          </div>
        </Link>
      </div>
      <div className="bg-background rounded-xl p-4">
        <dl className="w-full grid grid-cols-2 text-sm text-muted-foreground gap-1">
          <dt>Size</dt>
          <dd className="text-right text-primary">
            {numeralFormatter(bank.position.amount)} {bank.meta.tokenSymbol}
          </dd>
          <dt>USD Value</dt>
          <dd className="text-right text-primary">{usdFormatter.format(bank.position.usdValue)}</dd>
          <dt>Price</dt>
          <dd className="text-right text-primary">
            {usdFormatter.format(bank.info.oraclePrice.priceRealtime.price.toNumber())}
          </dd>
          {bank.position.liquidationPrice && (
            <>
              <dt>Liquidation Price</dt>
              <dd className="text-right text-primary">{usdFormatter.format(bank.position.liquidationPrice)}</dd>
            </>
          )}
        </dl>
      </div>
      <div className="flex items-center justify-between gap-4">
        <ActionBoxDialog requestedBank={bank} requestedAction={ActionType.Withdraw}>
          <Button variant="secondary">Withdraw</Button>
        </ActionBoxDialog>
        {collateralBank && (
          <ActionBoxDialog requestedBank={collateralBank} requestedAction={ActionType.Deposit}>
            <Button variant="secondary">Add collateral</Button>
          </ActionBoxDialog>
        )}
        <Link href={`/trade/${bank.address.toBase58()}`} className="ml-auto">
          <Button variant="secondary">
            Manage position <IconExternalLink size={16} />
          </Button>
        </Link>
      </div>
    </div>
  );
};
