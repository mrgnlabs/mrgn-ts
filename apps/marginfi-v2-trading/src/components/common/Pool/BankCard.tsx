import React from "react";

import Image from "next/image";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, usdFormatter, tokenPriceFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL } from "~/utils";
import { useTradeStore } from "~/store";
import { useAssetItemData } from "~/hooks/useAssetItemData";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";

type BankCardProps = {
  bank: ExtendedBankInfo;
};

export const BankCard = ({ bank }: BankCardProps) => {
  const { rateAP } = useAssetItemData({ bank, isInLendingMode: true });
  const [collateralBanks] = useTradeStore((state) => [state.collateralBanks]);

  const leverage = React.useMemo(() => {
    if (!bank || !bank.isActive) return 1;

    const collateralBank = collateralBanks[bank.address.toBase58()];
    const borrowBank = bank.position.isLending ? collateralBank : bank;

    if (!borrowBank) return 1;

    const depositBank = bank.address.equals(borrowBank.address) ? collateralBank : bank;

    if (!depositBank) return 1;

    let leverage = 1;
    if (borrowBank.isActive && depositBank.isActive) {
      const borrowUsd = borrowBank.position.usdValue;
      const depositUsd = depositBank.position.usdValue;

      leverage = Math.round((borrowUsd / depositUsd + Number.EPSILON) * 100) / 100 + 1;
    }
    return leverage;
  }, [bank, collateralBanks]);

  return (
    <div className="bg-background border p-4 rounded-lg space-y-4 flex flex-col justify-between">
      <div className="flex justify-between items-center w-full gap-2">
        <div className="flex text-left gap-3">
          <div className="flex items-center">
            <Image
              src={getTokenImageURL(bank.info.state.mint.toBase58())}
              className="rounded-full border"
              alt={bank.meta.tokenSymbol}
              height={40}
              width={40}
            />
          </div>
          <dl>
            <dt className="font-medium text-lg">{bank.meta.tokenSymbol}</dt>
            <dd className="text-sm font-normal text-success">{rateAP.concat(...[" ", "APY"])}</dd>
          </dl>
        </div>
        {bank.isActive && (
          <div className="font-medium text-lg mr-2">
            {bank.position.amount < 0.01 ? "< $0.01" : numeralFormatter(bank.position.amount)}
            {" " + bank.meta.tokenSymbol}
          </div>
        )}
      </div>
      {bank.isActive && bank.position && (
        <div className="bg-accent/50 py-3 px-4 rounded-lg text-sm">
          <dl className="grid grid-cols-2 gap-y-0.5 text-muted-foreground">
            <dt>Current price</dt>
            <dd className="text-right text-primary">
              {bank.info.state.price > 0.00001
                ? tokenPriceFormatter.format(bank.info.state.price)
                : `$${bank.info.state.price.toExponential(2)}`}
            </dd>
            <dt>USD value</dt>
            <dd className="text-right text-primary">
              {bank.position.usdValue < 0.01 ? "< $0.01" : usdFormatter.format(bank.position.usdValue)}
            </dd>
            {leverage && (
              <>
                <dt>Leverage</dt>
                <dd className="text-right text-primary">{`${leverage}x`}</dd>
              </>
            )}
            {bank.position.liquidationPrice && (
              <>
                <dt>Liquidation Price</dt>
                <dd className="text-right text-primary">
                  {tokenPriceFormatter.format(bank.position.liquidationPrice)}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}
      {!bank.isActive && (
        <div className="bg-background/60 py-6 px-4 rounded-lg text-sm text-muted-foreground">
          <p>No current position.</p>
        </div>
      )}
      <div className="flex justify-between w-full gap-4 mt-auto">
        {bank.isActive && (
          <ActionBoxDialog
            requestedAction={bank.position.isLending ? ActionType.Withdraw : ActionType.Repay}
            requestedBank={bank}
          >
            <Button className="h-12 w-1/2" variant="outline">
              {bank.position.isLending ? "Withdraw" : "Repay"}
            </Button>
          </ActionBoxDialog>
        )}
        <ActionBoxDialog requestedAction={ActionType.Deposit} requestedBank={bank}>
          <Button className="h-12 w-1/2 ml-auto" variant="default">
            Supply {bank.isActive && "more"}
          </Button>
        </ActionBoxDialog>
      </div>
    </div>
  );
};
