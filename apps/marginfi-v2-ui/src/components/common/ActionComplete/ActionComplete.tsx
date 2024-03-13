import React from "react";

import Link from "next/link";
import Image from "next/image";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { PublicKey } from "@solana/web3.js";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatterDyn, shortenAddress } from "@mrgnlabs/mrgn-common";

import { cn, getTokenImageURL } from "~/utils";
import { useUiStore, useLstStore, useMrgnlendStore } from "~/store";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Dialog, DialogContent } from "~/components/ui/dialog";
import { IconConfetti, IconExternalLink, IconArrowDown, IconArrowUp } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

export const ActionComplete = () => {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const [isActionComplete, setIsActionComplete, previousTxn] = useUiStore((state) => [
    state.isActionComplete,
    state.setIsActionComplete,
    state.previousTxn,
  ]);
  const [lstData] = useLstStore((state) => [state.lstData]);
  const { rateAP } = useAssetItemData({
    bank: previousTxn?.bank!,
    isInLendingMode: previousTxn?.type === ActionType.Deposit,
  });
  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  const lstBank = React.useMemo(() => {
    const filtered = extendedBankInfos.filter((bank) =>
      bank.address.equals(new PublicKey("DMoqjmsuoru986HgfjqrKEvPv8YBufvBGADHUonkadC5"))
    );
    return filtered.length > 0 ? filtered[0] : null;
  }, [extendedBankInfos]);

  const actionTextColor = React.useMemo(() => {
    const successTypes = [ActionType.Deposit, ActionType.Withdraw, ActionType.MintLST];
    const warningTypes = [ActionType.Borrow, ActionType.Repay];
    if (successTypes.includes(previousTxn?.type!)) return "text-success";
    if (warningTypes.includes(previousTxn?.type!)) return "text-warning";
    return "";
  }, [previousTxn?.type]);

  if (!isActionComplete || !previousTxn) return null;

  return (
    <div>
      <Confetti
        width={width!}
        height={height! * 2}
        recycle={false}
        opacity={0.4}
        className={cn(isMobile ? "z-[80]" : "z-[60]")}
      />
      <Dialog open={isActionComplete} onOpenChange={(open) => setIsActionComplete(open)}>
        <DialogContent className="z-[70]">
          <div className="space-y-12 w-full">
            <header className="space-y-4 text-center flex flex-col items-center justify-center">
              <IconConfetti size={48} />
              <h2 className="font-medium text-xl">
                {previousTxn?.type === ActionType.Deposit && "Deposit Completed!"}
                {previousTxn?.type === ActionType.MintLST && "LST Minted!"}
                {previousTxn?.type !== ActionType.Deposit &&
                  previousTxn?.type !== ActionType.MintLST &&
                  previousTxn?.type + " Completed!"}
              </h2>
            </header>

            {!previousTxn.lstQuote && (
              <>
                <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-4xl font-medium">
                      {previousTxn?.amount} {previousTxn?.bank.meta.tokenSymbol}
                    </h3>
                    <Image
                      className="rounded-full w-9 h-9"
                      src={getTokenImageURL(previousTxn?.bank.meta.tokenSymbol)}
                      alt={(previousTxn?.bank.meta.tokenSymbol || "Token") + "  logo"}
                      width={36}
                      height={36}
                    />
                  </div>
                </div>
                <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
                  {previousTxn?.bank.position && (
                    <>
                      <dt>Total {previousTxn?.bank.meta.tokenSymbol} Deposits</dt>
                      <dd className="text-right">
                        {previousTxn?.bank.position.amount} {previousTxn?.bank.meta.tokenSymbol}
                      </dd>
                    </>
                  )}
                  <dt>APY</dt>
                  <dd className={cn("text-right", actionTextColor)}>{rateAP}</dd>
                  <dt>Transaction</dt>
                  <dd className="text-right">
                    <Link
                      href={`https://solscan.io/tx/${previousTxn?.txn}`}
                      className="flex items-center justify-end gap-1.5 text-chartreuse text-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {shortenAddress(previousTxn?.txn || "")}{" "}
                      <IconExternalLink size={15} className="-translate-y-[1px]" />
                    </Link>
                  </dd>
                </dl>
              </>
            )}

            {previousTxn.lstQuote && previousTxn.lstQuote.quoteResponse.outAmount && lstData && lstBank && (
              <>
                <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-4xl font-medium">
                      {Number(previousTxn.lstQuote.quoteResponse.outAmount.toString()) / 10 ** 9} LST
                    </h3>
                    <Image
                      className="rounded-full w-9 h-9"
                      src={getTokenImageURL(lstBank.meta.tokenSymbol)}
                      alt={(lstBank.meta.tokenSymbol || "Token") + "  logo"}
                      width={36}
                      height={36}
                    />
                  </div>
                </div>
                <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
                  <dt>Staked</dt>
                  <dd className="text-right">
                    {previousTxn.amount} {previousTxn.bank.meta.tokenSymbol}
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
                      href={`https://solscan.io/tx/${previousTxn?.txn}`}
                      className="flex items-center justify-end gap-1.5 text-chartreuse text-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {shortenAddress(previousTxn?.txn || "")}{" "}
                      <IconExternalLink size={15} className="-translate-y-[1px]" />
                    </Link>
                  </dd>
                </dl>
              </>
            )}
            <Button className="w-full mx-auto" onClick={() => setIsActionComplete(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
