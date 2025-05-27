import React from "react";

import Image from "next/image";
import Link from "next/link";

import { IconAlertTriangle, IconExternalLink, IconFolderShare, IconInfoCircle } from "@tabler/icons-react";
import { Transaction } from "@solana/web3.js";
import {
  usdFormatter,
  dynamicNumeralFormatter,
  groupedNumberFormatter,
  tokenPriceFormatter,
  percentFormatter,
  shortenAddress,
  TransactionType,
  addTransactionMetadata,
  percentFormatterMod,
} from "@mrgnlabs/mrgn-common";
import { replenishPoolIx } from "@mrgnlabs/marginfi-client-v2/dist/vendor";
import { ActiveBankInfo, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { AssetTag, EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import { capture, cn, composeExplorerUrl, executeActionWrapper, getAssetWeightData } from "@mrgnlabs/mrgn-utils";
import { ActionBox, SVSPMEV, useWallet } from "@mrgnlabs/mrgn-ui";

import { useAssetItemData } from "~/hooks/useAssetItemData";
import { useMrgnlendStore, useUiStore } from "~/store";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, ChevronDown } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

import { MovePositionDialog } from "../move-position";
import { TooltipProvider } from "~/components/ui/tooltip";
import { TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Tooltip } from "~/components/ui/tooltip";
import { EmodeDiff, EmodePopover } from "~/components/common/emode/components";
import { Badge } from "~/components/ui/badge";
import { IconEmode } from "~/components/ui/icons";

interface PortfolioAssetCardProps {
  bank: ActiveBankInfo;
  isInLendingMode: boolean;
  isBorrower?: boolean;
  accountLabels?: Record<string, string>;
  variant?: "accordion" | "simple";

  onCardClick?: () => void;
}

export const PortfolioAssetCard = ({
  bank,
  isInLendingMode,
  isBorrower = true,
  accountLabels,
  variant = "accordion",
  onCardClick,
}: PortfolioAssetCardProps) => {
  const { rateAP } = useAssetItemData({ bank, isInLendingMode });
  const [
    selectedAccount,
    marginfiAccounts,
    marginfiClient,
    fetchMrgnlendState,
    extendedBankInfos,
    nativeSolBalance,
    accountSummary,
    userActiveEmodes,
    collateralBanksByLiabilityBank,
    liabilityBanksByCollateralBank,
  ] = useMrgnlendStore((state) => [
    state.selectedAccount,
    state.marginfiAccounts,
    state.marginfiClient,
    state.fetchMrgnlendState,
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.accountSummary,
    state.userActiveEmodes,
    state.collateralBanksByLiabilityBank,
    state.liabilityBanksByCollateralBank,
  ]);
  const [priorityFees] = useUiStore((state) => [state.priorityFees]);
  const isIsolated = React.useMemo(() => bank.info.state.isIsolated, [bank]);

  const collateralBanks = React.useMemo(() => {
    const banks = collateralBanksByLiabilityBank[bank.address.toBase58()] || [];
    return banks.length > 0
      ? banks.filter((bank) => bank.collateralBank.isActive && bank.collateralBank.position.isLending)
      : [];
  }, [collateralBanksByLiabilityBank, bank]);

  const liabilityBanks = React.useMemo(() => {
    const banks = liabilityBanksByCollateralBank[bank.address.toBase58()] || [];
    return banks;
  }, [liabilityBanksByCollateralBank, bank]);

  const isEmodeActive = React.useMemo(() => {
    return (
      (isInLendingMode && bank.position.emodeActive) ||
      (!isInLendingMode && collateralBanks.length > 0 && userActiveEmodes.length > 0)
    );
  }, [bank.position.emodeActive, collateralBanks, isInLendingMode, userActiveEmodes]);

  const isUserPositionPoorHealth = React.useMemo(() => {
    if (!bank || !bank?.position?.liquidationPrice) {
      return false;
    }

    const alertRange = 0.05;

    if (bank.position.isLending) {
      return bank.info.state.price < bank.position.liquidationPrice + bank.position.liquidationPrice * alertRange;
    } else {
      return bank.info.state.price > bank.position.liquidationPrice - bank.position.liquidationPrice * alertRange;
    }
  }, [bank]);

  const [isMovePositionDialogOpen, setIsMovePositionDialogOpen] = React.useState<boolean>(false);
  const postionMovingPossible = React.useMemo(
    () => marginfiAccounts.length > 1 && bank.position.isLending,
    [marginfiAccounts.length, bank]
  );

  const assetWeight = React.useMemo(
    () => getAssetWeightData(bank, isInLendingMode).assetWeight,
    [bank, isInLendingMode]
  );

  const originalAssetWeight = React.useMemo(
    () => getAssetWeightData(bank, isInLendingMode, bank.info.state.originalWeights.assetWeightInit).assetWeight,
    [bank, isInLendingMode]
  );

  if (variant === "simple") {
    return (
      <div
        className="bg-background-gray rounded-xl px-3 py-3.5 flex gap-3 items-center cursor-pointer hover:bg-background-gray-light transition"
        onClick={onCardClick}
      >
        <Image
          src={bank.meta.tokenLogoUri}
          className="rounded-full -translate-y-0.5"
          alt={bank.meta.tokenSymbol}
          height={36}
          width={36}
        />
        <div className="flex items-center gap-1 w-full">
          <div className="flex flex-col flex-1 -translate-y-0.5">
            <div className="flex items-center gap-2 font-medium text-lg">
              {bank.meta.tokenSymbol}
              {isEmodeActive && <IconEmode size={22} className="-translate-y-1" />}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className={isInLendingMode ? "text-success" : "text-warning"}>{rateAP} APY</span>
            </div>
          </div>
          <div className="text-right pr-2 leading-none space-y-0 -translate-y-0.5">
            <div className="font-medium text-lg">
              {dynamicNumeralFormatter(bank.position.amount, {
                tokenPrice: bank.info.oraclePrice.priceRealtime.price.toNumber(),
              })}
              {" " + bank.meta.tokenSymbol}
            </div>
            <span className="text-muted-foreground text-sm font-normal">
              {usdFormatter.format(bank.position.usdValue)}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 self-start translate-y-1 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </div>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible>
      <AccordionItem
        value="key-1"
        className="bg-background-gray transition rounded-xl px-3 data-[state=closed]:hover:bg-background-gray-light"
      >
        <AccordionTrigger
          variant="portfolio"
          className="hover:no-underline outline-none py-3 [&[data-state=open]>div>div>#health-label]:opacity-0 [&[data-state=open]>div>div>#health-label]:mb-[-24px]"
        >
          <div className="w-full space-y-1 pr-3 ">
            <div className="flex gap-3">
              <div className="flex items-center">
                <Image
                  src={bank.meta.tokenLogoUri}
                  className="rounded-full"
                  alt={bank.meta.tokenSymbol}
                  height={40}
                  width={40}
                />
              </div>
              <div className="flex flex-col w-full">
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2 font-medium text-lg">
                    {bank.meta.tokenSymbol} {isEmodeActive && <IconEmode size={22} className="-translate-y-1" />}
                  </div>
                  <div className="font-medium text-lg text-right">
                    {dynamicNumeralFormatter(bank.position.amount, {
                      tokenPrice: bank.info.oraclePrice.priceRealtime.price.toNumber(),
                    })}
                    {" " + bank.meta.tokenSymbol}
                  </div>
                </div>
                <div className="flex justify-between items-center w-full">
                  <div>
                    {bank.info.rawBank.config.assetTag === AssetTag.STAKED ? (
                      <div className="font-normal flex items-center text-sm text-muted-foreground">
                        {bank.meta.stakePool?.validatorRewards && (
                          <>
                            <span className="text-success">
                              {percentFormatter.format(bank.meta.stakePool?.validatorRewards / 100)}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 ml-2">
                                    <span className="text-xs">Total APY</span>
                                    <IconInfoCircle size={14} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Total rewards from the validator.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className={cn("text-sm font-light", isInLendingMode ? "text-success" : "text-warning")}>
                        {rateAP.concat(...[" ", "APY"])}
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground font-normal text-sm text-right">
                    {usdFormatter.format(bank.position.usdValue)}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-row w-full gap-2">
              {isIsolated && (
                <div className="flex w-fit text-muted-foreground bg-muted items-center rounded-3xl px-3 py-1 mt-4 text-xs">
                  <span>Isolated pool</span>
                </div>
              )}
              {isUserPositionPoorHealth && isBorrower && (
                <div
                  id="health-label"
                  className={cn(
                    "flex w-fit text-destructive-foreground bg-destructive items-center rounded-3xl px-3 py-1 mt-4 text-xs",
                    "transition-all duration-500 ease-in-out gap-1.5"
                  )}
                >
                  <IconAlertTriangle width={"12px"} height={"12px"} />
                  <span>Liquidation risk</span>
                </div>
              )}
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent
          className="flex flex-col gap-3"
          contentClassName="[&[data-state=open]>div>#health-label]:opacity-100"
        >
          {isUserPositionPoorHealth && isBorrower && (
            <div
              id="health-label"
              className="flex flex-row gap-2 opacity-0 w-full transition-opacity duration-2000 ease-in bg-destructive text-destructive-foreground text-sm p-2.5 rounded-xl"
            >
              <IconAlertTriangle width={"16px"} height={"16px"} />
              <div className="flex flex-col ">
                <span>Liquidation risk</span>
                <p>You need to add more collateral in order to sustain this position</p>
              </div>
            </div>
          )}
          <div className="bg-background/60 py-3 px-4 rounded-lg">
            <dl className="grid grid-cols-2 gap-y-0.5">
              {bank.info.rawBank.config.assetTag === AssetTag.STAKED && bank.meta.stakePool?.validatorVoteAccount && (
                <>
                  <dt className="text-muted-foreground">Validator</dt>
                  <dd className="text-right text-white">
                    <Link
                      href={`https://solscan.io/account/${bank.meta.stakePool?.validatorVoteAccount}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-end gap-1 transition-colors hover:text-chartreuse"
                    >
                      <IconExternalLink size={14} className="text-muted-foreground" />
                      {shortenAddress(bank.meta.stakePool?.validatorVoteAccount)}
                    </Link>
                  </dd>
                </>
              )}
              {isEmodeActive ? (
                <>
                  <dt className="text-muted-foreground">{isInLendingMode ? "Weight" : "e-mode boost"}</dt>
                  <dd className="text-right text-white">
                    {bank.position || collateralBanks.length > 0 ? (
                      <div className={cn("flex items-center justify-end gap-1", isEmodeActive && "text-mfi-emode")}>
                        {!isInLendingMode && collateralBanks.length > 0 && (
                          <div className="flex items-center">
                            <IconEmode size={18} />
                            <ul className="flex items-center gap-1">
                              {collateralBanks.map((bank) => (
                                <li key={bank.collateralBank.address.toBase58()}>
                                  <Image
                                    src={bank.collateralBank.meta.tokenLogoUri}
                                    className="rounded-full"
                                    alt={bank.collateralBank.meta.tokenSymbol}
                                    height={18}
                                    width={18}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {isInLendingMode && isEmodeActive && (
                          <>
                            <IconEmode size={18} />
                            <EmodeDiff assetWeight={assetWeight} originalAssetWeight={originalAssetWeight} />
                          </>
                        )}
                      </div>
                    ) : null}
                  </dd>
                </>
              ) : null}
              {(!isEmodeActive || !isInLendingMode) && (
                <>
                  <dt className="text-muted-foreground">{isInLendingMode ? "Weight" : "LTV"}</dt>
                  <dd className="text-right text-white flex items-center justify-end">
                    {/* {!isEmodeActive ? (
                      <EmodePopover
                        assetWeight={assetWeight}
                        originalAssetWeight={originalAssetWeight}
                        emodeActive={isEmodeActive}
                        isInLendingMode={isInLendingMode}
                        collateralBanks={collateralBanks}
                        liabilityBanks={liabilityBanks}
                        triggerType="weight"
                      />
                    ) : (
                      percentFormatter.format(assetWeight)
                    )} */}
                    {percentFormatter.format(assetWeight)}
                  </dd>
                </>
              )}
              <dt className="text-muted-foreground">Value</dt>
              <dd className="text-right text-white">
                {bank.position.amount > 1000
                  ? groupedNumberFormatter.format(bank.position.amount)
                  : dynamicNumeralFormatter(bank.position.amount, {
                      tokenPrice: bank.info.oraclePrice.priceRealtime.price.toNumber(),
                    })}
                {" " + bank.meta.tokenSymbol}
              </dd>
              <dt className="text-muted-foreground">USD value</dt>
              <dd className="text-right text-white">{usdFormatter.format(bank.position.usdValue)}</dd>
              <dt className="text-muted-foreground">Current price</dt>
              <dd className="text-right text-white">{tokenPriceFormatter(bank.info.state.price)}</dd>
              {bank.position.liquidationPrice && (
                <>
                  <dt className="text-muted-foreground">Liquidation price</dt>
                  <dd
                    className={cn(
                      "justify-end flex items-center gap-1",
                      isUserPositionPoorHealth ? "text-error" : "text-white"
                    )}
                  >
                    {isUserPositionPoorHealth && <IconAlertTriangle width={"16px"} height={"16px"} />}
                    {tokenPriceFormatter(bank.position.liquidationPrice)}
                  </dd>
                </>
              )}
            </dl>
          </div>
          {bank.info.rawBank.config.assetTag === AssetTag.STAKED && (
            <SVSPMEV
              bank={bank}
              onClaim={async () => {
                if (!marginfiClient || !bank.meta.stakePool?.validatorVoteAccount) return;

                const ix = await replenishPoolIx(bank.meta.stakePool?.validatorVoteAccount);
                const tx = addTransactionMetadata(new Transaction().add(ix), {
                  type: TransactionType.INITIALIZE_STAKED_POOL,
                });

                await executeActionWrapper({
                  actionName: "Replenish MEV rewards",
                  steps: [{ label: "Signing transaction" }, { label: "Replenishing SVSP MEV" }],
                  action: async (txns, onSuccessAndNext) => {
                    const sigs = await marginfiClient.processTransactions(txns.transactions, {
                      broadcastType: "RPC",
                      ...priorityFees,
                      callback(index, success, sig, stepsToAdvance) {
                        success && onSuccessAndNext(stepsToAdvance, composeExplorerUrl(sig), sig);
                      },
                    });
                    return sigs[0];
                  },
                  onComplete: () => {
                    fetchMrgnlendState();
                  },
                  txns: {
                    transactions: [tx],
                  },
                });
              }}
              className="mb-4"
            />
          )}
          <div className="flex w-full gap-3">
            <PortfolioAction
              requestedBank={bank}
              buttonVariant="secondary"
              requestedAction={isInLendingMode ? ActionType.Withdraw : ActionType.Repay}
            />
            <PortfolioAction
              requestedBank={bank}
              requestedAction={isInLendingMode ? ActionType.Deposit : ActionType.Borrow}
            />
          </div>

          {postionMovingPossible && (
            <button
              onClick={() => {
                setIsMovePositionDialogOpen(true);
              }}
              className="my-2 w-max self-center text-muted-foreground/75 font-normal text-xs flex items-center gap-1 transition-opacity hover:text-muted-foreground/100"
            >
              <IconFolderShare size={14} /> Move position
            </button>
          )}

          <MovePositionDialog
            isOpen={isMovePositionDialogOpen}
            setIsOpen={setIsMovePositionDialogOpen}
            selectedAccount={selectedAccount}
            marginfiAccounts={marginfiAccounts}
            bank={bank}
            marginfiClient={marginfiClient}
            fetchMrgnlendState={fetchMrgnlendState}
            extendedBankInfos={extendedBankInfos}
            nativeSolBalance={nativeSolBalance}
            accountSummary={accountSummary}
            accountLabels={accountLabels}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

const PortfolioAction = ({
  requestedBank,
  requestedAction,
  buttonVariant = "default",
}: {
  requestedBank: ExtendedBankInfo;
  requestedAction: ActionType;
  buttonVariant?: "default" | "outline" | "outline-dark" | "secondary";
}) => {
  const { walletContextState, connected } = useWallet();
  const [fetchMrgnlendState, stakeAccounts] = useMrgnlendStore((state) => [
    state.fetchMrgnlendState,
    state.stakeAccounts,
  ]);
  const isDust = React.useMemo(() => requestedBank?.isActive && requestedBank?.position.isDust, [requestedBank]);

  const buttonText = React.useMemo(() => {
    switch (requestedAction) {
      case ActionType.Deposit:
        return "Supply more";
      case ActionType.Borrow:
        return "Borrow more";
      case ActionType.Repay:
        return "Repay";
      case ActionType.Withdraw:
        return isDust ? "Close" : "Withdraw";
      default:
        return "";
    }
  }, [requestedAction, isDust]);

  if (requestedAction !== ActionType.Repay) {
    return (
      <ActionBox.Lend
        useProvider={true}
        lendProps={{
          requestedLendType: requestedAction,
          requestedBank: requestedBank ?? undefined,
          walletContextState: walletContextState,
          connected: connected,
          stakeAccounts: stakeAccounts,
          captureEvent: (event, properties) => {
            capture(event, properties);
          },
          onComplete: () => {
            fetchMrgnlendState();
          },
        }}
        isDialog={true}
        dialogProps={{
          trigger: (
            <Button className="flex-1 h-12" variant={buttonVariant}>
              {buttonText}
            </Button>
          ),
          title: `${requestedAction} ${requestedBank?.meta.tokenSymbol}`,
        }}
      />
    );
  } else {
    return (
      <ActionBox.Repay
        useProvider={true}
        repayProps={{
          requestedBank: requestedBank,
          requestedSecondaryBank: undefined,
          connected: connected,
          captureEvent: (event, properties) => {
            capture(event, properties);
          },
          onComplete: () => {
            fetchMrgnlendState();
          },
        }}
        isDialog={true}
        dialogProps={{
          trigger: (
            <Button className="flex-1 h-12" variant={buttonVariant}>
              {buttonText}
            </Button>
          ),
          title: `${requestedAction} ${requestedBank?.meta.tokenSymbol}`,
        }}
      />
    );
  }
};

export const PortfolioAssetCardSkeleton = () => {
  return (
    <div className="flex justify-between items-center w-full p-3 gap-2">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[65px]" />
        </div>
      </div>
      <Skeleton className="h-6 w-[80px] " />
    </div>
  );
};
