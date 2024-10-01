import React from "react";

import Link from "next/link";
import Image from "next/image";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { PublicKey } from "@solana/web3.js";
import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatterDyn, shortenAddress, percentFormatter } from "@mrgnlabs/mrgn-common";

import { LSTS_SOLANA_COMPASS_MAP, calcLstYield, calcNetLoopingApy, cn } from "~/utils";
import { useUiStore, useLstStore, useMrgnlendStore } from "~/store";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { useIsMobile } from "~/hooks/use-is-mobile";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { IconConfetti, IconExternalLink, IconArrowDown, IconArrowUp } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

export const ActionComplete = () => {
  const [loopApy, setLoopApy] = React.useState<{ netApy: number; totalDepositApy: number; totalBorrowApy: number }>({
    netApy: 0,
    totalDepositApy: 0,
    totalBorrowApy: 0,
  });
  const [extendedBankInfos, mfiAccount] = useMrgnlendStore((state) => [state.extendedBankInfos, state.selectedAccount]);
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

  const getLstYield = React.useCallback(async (bank: ExtendedBankInfo) => {
    const solanaCompassKey = LSTS_SOLANA_COMPASS_MAP[bank.meta.tokenSymbol];
    if (!solanaCompassKey) return 0;

    const response = await fetch(`/api/lst?solanaCompassKey=${solanaCompassKey}`);
    if (!response.ok) return 0;

    const solanaCompassPrices = await response.json();
    return calcLstYield(solanaCompassPrices);
  }, []);

  const calculateLoopingRate = React.useCallback(async () => {
    const lstDepositApy = await getLstYield(previousTxn?.loopingOptions?.depositBank!);
    const lstBorrowApy = await getLstYield(previousTxn?.loopingOptions?.borrowBank!);

    const { netApy, totalDepositApy, depositLstApy, totalBorrowApy, borrowLstApy } = calcNetLoopingApy(
      previousTxn?.loopingOptions?.depositBank!,
      previousTxn?.loopingOptions?.borrowBank!,
      lstDepositApy,
      lstBorrowApy,
      previousTxn?.loopingOptions?.leverage!
    );
    setLoopApy({
      netApy,
      totalDepositApy: totalDepositApy + depositLstApy,
      totalBorrowApy: totalBorrowApy + borrowLstApy,
    });
  }, [
    getLstYield,
    previousTxn?.loopingOptions?.borrowBank,
    previousTxn?.loopingOptions?.depositBank,
    previousTxn?.loopingOptions?.leverage,
  ]);

  React.useEffect(() => {
    if (previousTxn?.type === ActionType.Loop) {
      calculateLoopingRate();
    }
  }, [previousTxn]);

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

  const isFirstDeposit = React.useMemo(() => {
    const activeBalances = mfiAccount?.balances.filter((balance) => balance.active);
    return activeBalances && activeBalances.length <= 1 && previousTxn?.type === ActionType.Deposit;
  }, [mfiAccount?.balances]);

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
          <div className={cn("space-y-12 w-full", isFirstDeposit && "space-y-8")}>
            <DialogHeader>
              <DialogTitle className="space-y-4 text-center flex flex-col items-center justify-center">
                <IconConfetti size={48} />
                <h2 className="font-medium text-xl">
                  {previousTxn?.type === ActionType.Deposit && "Deposit Completed!"}
                  {previousTxn?.type === ActionType.MintLST && "LST Minted!"}
                  {previousTxn?.type !== ActionType.Deposit &&
                    previousTxn?.type !== ActionType.MintLST &&
                    previousTxn?.type + " Completed!"}
                </h2>{" "}
              </DialogTitle>
            </DialogHeader>

            {isFirstDeposit && (
              <div className="text-center text-muted-foreground">
                <p>
                  Congratulations on your first deposit with marginfi!
                  <br className="hidden md:block" />{" "}
                  <Link
                    href="https://docs.marginfi.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="border-b border-muted-foreground transition-colors hover:border-transparent"
                  >
                    Check out our docs
                  </Link>{" "}
                  for more info on lending, borrowing, and staking.
                </p>
              </div>
            )}
            {!previousTxn.lstQuote && !previousTxn.loopingOptions && (
              <>
                <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-4xl font-medium">
                      {previousTxn?.amount} {previousTxn?.bank.meta.tokenSymbol}
                    </h3>
                    <Image
                      className="rounded-full w-9 h-9"
                      src={previousTxn?.bank.meta.tokenLogoUri}
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
                  {previousTxn.type === ActionType.Loop ? (
                    <dd className={cn("text-right", actionTextColor)}>{percentFormatter.format(loopApy.netApy)}</dd>
                  ) : (
                    <dd className={cn("text-right", actionTextColor)}>{rateAP}</dd>
                  )}
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

            {previousTxn.lstQuote &&
              previousTxn.lstQuote.quoteResponse.outAmount &&
              lstData &&
              lstBank &&
              !previousTxn.loopingOptions && (
                <>
                  <div className="flex flex-col items-center gap-2 border-b border-border pb-10">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-4xl font-medium">
                        {Number(previousTxn.lstQuote.quoteResponse.outAmount.toString()) / 10 ** 9} LST
                      </h3>
                      <Image
                        className="rounded-full w-9 h-9"
                        src={lstBank.meta.tokenLogoUri}
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

            {previousTxn.loopingOptions && (
              <>
                <div className="flex flex-col items-center justify-center text-center border-b border-border pb-16">
                  <div className="space-y-2">
                    <h4 className="text-base">Final deposit</h4>
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-3xl font-medium">
                        {previousTxn.loopingOptions.depositAmount.toFixed(4).replace(/\.?0+$/, "")}{" "}
                        {previousTxn.loopingOptions.depositBank.meta.tokenSymbol}
                      </h3>
                      <Image
                        className="rounded-full w-7 h-7"
                        src={previousTxn.loopingOptions.depositBank.meta.tokenLogoUri}
                        alt={(previousTxn.loopingOptions.depositBank.meta.tokenSymbol || "Token") + "  logo"}
                        width={28}
                        height={28}
                      />
                    </div>
                  </div>
                  <div className="text-4xl my-4">➰</div>
                  <div className="space-y-2">
                    <h4 className="text-base">Final borrow</h4>
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-3xl font-medium">
                        {previousTxn.loopingOptions.borrowAmount.toFixed(4).replace(/\.?0+$/, "")}{" "}
                        {previousTxn.loopingOptions.borrowBank.meta.tokenSymbol}
                      </h3>
                      <Image
                        className="rounded-full w-7 h-7"
                        src={previousTxn.loopingOptions.borrowBank.meta.tokenLogoUri}
                        alt={(previousTxn.loopingOptions.borrowBank.meta.tokenSymbol || "Token") + "  logo"}
                        width={28}
                        height={28}
                      />
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-2 w-full text-muted-foreground gap-x-8 gap-y-2">
                  <dt>Net APY</dt>
                  <dd className={cn("text-right")}>{percentFormatter.format(Math.abs(loopApy.netApy))}</dd>
                  <dt className="text-sm opacity-75">{previousTxn.loopingOptions.depositBank.meta.tokenSymbol}</dt>
                  <dd className="text-sm opacity-75 text-right text-success">
                    {percentFormatter.format(loopApy.totalDepositApy)}
                  </dd>
                  <dt className="text-sm opacity-75">{previousTxn.loopingOptions.borrowBank.meta.tokenSymbol}</dt>
                  <dd className="text-sm opacity-75 text-right text-warning">
                    {percentFormatter.format(loopApy.totalBorrowApy)}
                  </dd>

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
            <div className="space-y-4">
              <Button className="w-full mx-auto" onClick={() => setIsActionComplete(false)}>
                Done
              </Button>
              {!previousTxn.lstQuote && (
                <div className="flex flex-col sm:flex-row text-sm items-center justify-center text-center">
                  <p className="opacity-60">Get daily alerts on your position using</p>
                  <Link
                    href="https://t.me/AsgardWatchBot"
                    className="flex items-center gap-1.5 text-chartreuse sm:ml-1.5"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    AsgardWatchBot <IconExternalLink size={14} className="-translate-y-[1px]" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
