import React from "react";

import Image from "next/image";
import Link from "next/link";
import {
  aprToApy,
  dynamicNumeralFormatter,
  numeralFormatter,
  percentFormatter,
  percentFormatterMod,
  shortenAddress,
  usdFormatter,
} from "@mrgnlabs/mrgn-common";
import { IconAlertTriangle, IconExternalLink, IconInfoCircle } from "@tabler/icons-react";

import {
  AssetData,
  AssetPriceData,
  AssetWeightData,
  BankCapData,
  cn,
  DepositsData,
  PositionData,
  RateData,
  UtilizationData,
  EMISSION_MINT_INFO_MAP,
} from "@mrgnlabs/mrgn-utils";

import { IMAGE_CDN_URL } from "~/config/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from "~/components/ui/tooltip";
import { IconPyth, IconSwitchboard } from "~/components/ui/icons";

export const getAssetCell = (asset: AssetData) => {
  return (
    <div className="flex gap-2 justify-start items-center">
      <div className="flex items-center gap-4">
        <Image src={asset.image} alt={`${asset.symbol} logo`} height={25} width={25} className="rounded-full" />
        <div>{asset.symbol}</div>
      </div>

      {asset.stakePool && (
        <>
          <div className="text-xs text-muted-foreground font-normal space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="text-xs text-muted-foreground font-normal flex items-center gap-1 cursor-default">
                  <IconInfoCircle size={14} />
                  {!asset.stakePool.isActive && "Activating..."}
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent>
                    <ul className="space-y-1 font-normal text-muted-foreground">
                      <li className="text-xs">
                        <strong className="text-foreground">Validator:</strong>{" "}
                        {shortenAddress(asset.stakePool.validatorVoteAccount?.toBase58() ?? "")}
                      </li>
                    </ul>
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            </TooltipProvider>
          </div>
        </>
      )}
    </div>
  );
};

const formatPrice = (price: number) => {
  if (price >= 1) return usdFormatter.format(price);
  if (price >= 0.0000001) {
    return `$${dynamicNumeralFormatter(price, {
      minDisplay: 0.0000001,
      tokenPrice: price,
      forceDecimals: true,
    })}`;
  }
  if (price > 0) return `$${price.toExponential(2)}`;
  return 0;
};

export const getAssetPriceCell = ({
  oracle,
  assetPrice,
  assetPriceOffset,
  symbol,
  price,
  isOracleStale,
  isInLendingMode = true,
}: AssetPriceData) => (
  <div className="relative flex items-center justify-end gap-1.5">
    <div className="relative">
      {formatPrice(assetPrice)}
      {assetPriceOffset > assetPrice * 0.1 && (
        <div className="absolute top-[-8px] right-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute text-xs">⚠️</div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-2">
                  <h4 className="text-base">Wide oracle price bands</h4>
                  {`${symbol} price estimates is
              ${usdFormatter.format(price)} ± ${assetPriceOffset.toFixed(
                    2
                  )}, which is wide. Proceed with caution. marginfi prices assets at the bottom of confidence bands and liabilities at the top.`}
                  <br />
                  <a href="https://docs.marginfi.com">
                    <u>Learn more.</u>
                  </a>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
    {oracle && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{oracle === "Pyth" ? <IconPyth size={14} /> : <IconSwitchboard size={14} />}</div>
          </TooltipTrigger>
          <TooltipContent>Powered by {oracle}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
    {isOracleStale && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconAlertTriangle size={14} className="text-warning shrink-0" />
          </TooltipTrigger>
          <TooltipContent className="space-y-3 max-w-[17rem]">
            <p>
              {isInLendingMode ? "Withdrawals from" : "Borrows from"} this bank may fail due to network congestion
              preventing oracles from updating price data.
            </p>
            <p>
              <Link
                href="https://docs.marginfi.com/faqs#what-does-the-stale-oracles-error-mean"
                target="_blank"
                rel="noreferrer"
                className="border-b leading-normal border-primary/50 hover:border-transparent transition-colors"
              >
                <IconExternalLink size={12} className="inline mr-1 -translate-y-[1px]" />
                Learn more about marginfi&apos;s decentralized oracle strategy.
              </Link>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </div>
);

export const getRateCell = ({
  rateAPY,
  symbol,
  emissionRate,
  emissionsRemaining,
  lendingRate,
  isInLendingMode,
}: RateData) => {
  return (
    <div className={cn("flex justify-end items-center gap-2", isInLendingMode ? "text-success" : "text-warning")}>
      {emissionRate > 0 &&
        emissionsRemaining > 0 &&
        EMISSION_MINT_INFO_MAP.get(symbol) !== undefined &&
        isInLendingMode && (
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Image
                    src={EMISSION_MINT_INFO_MAP.get(symbol)!.tokenLogoUri}
                    alt="info"
                    height={18}
                    width={18}
                    className="rounded-full"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col items-start gap-1.5">
                    <h4 className="text-base flex items-center gap-1.5">
                      <Image
                        src={EMISSION_MINT_INFO_MAP.get(symbol)!.tokenLogoUri}
                        alt="info"
                        height={18}
                        width={18}
                        className="rounded-full"
                      />{" "}
                      Liquidity rewards
                    </h4>
                    <p className="text-xs">
                      {`${percentFormatter.format(aprToApy(lendingRate))} Supply APY + ${percentFormatter.format(
                        aprToApy(emissionRate)
                      )} ${EMISSION_MINT_INFO_MAP.get(symbol)!.tokenSymbol} rewards. `}
                    </p>
                    <p className="text-xs">
                      <Link
                        target="_blank"
                        rel="noreferrer"
                        href="https://docs.marginfi.com"
                        className="inline-block border-b transition-colors hover:border-transparent text-xs"
                      >
                        Learn more.
                      </Link>
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      {symbol === "mSOL" && (
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Image
                  src={`${IMAGE_CDN_URL}/MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey.png`}
                  alt="info"
                  height={18}
                  width={18}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col items-start gap-1.5">
                  <h4 className="text-base flex items-center gap-1.5">
                    <Image
                      src={`${IMAGE_CDN_URL}/MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey.png`}
                      alt="info"
                      height={18}
                      width={18}
                    />
                    MNDE rewards
                  </h4>
                  <p className="text-xs">Eligible for Marinade Earn rewards.</p>
                  <Link
                    target="_blank"
                    rel="noreferrer"
                    href="https://marinade.finance/app/earn/"
                    className="inline-block border-b transition-colors hover:border-transparent text-xs"
                  >
                    Learn more
                  </Link>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div className="flex justify-end">{percentFormatter.format(rateAPY)}</div>
    </div>
  );
};

export const getAssetWeightCell = ({ assetWeight }: AssetWeightData) => (
  <div className="flex justify-end">{!assetWeight ? <>-</> : <>{(assetWeight * 100).toFixed(0) + "%"}</>}</div>
);

export const getDepositsCell = (depositsData: DepositsData) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "flex items-center justify-end gap-1.5 text-white",
              (depositsData.isReduceOnly || depositsData.isBankHigh) && "text-warning",
              depositsData.isBankFilled && "text-destructive-foreground"
            )}
          >
            {depositsData.denominationUSD
              ? usdFormatter.format(depositsData.bankDeposits)
              : numeralFormatter(depositsData.bankDeposits)}

            {(depositsData.isReduceOnly || depositsData.isBankHigh || depositsData.isBankFilled) && (
              <IconAlertTriangle size={14} />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-left">
          {depositsData.isStakedAsset && !depositsData.isInLendingMode ? (
            <div>
              <span>Native stake can only be deposited at this time.</span>
            </div>
          ) : (
            <>
              <div>
                {depositsData.isReduceOnly
                  ? "Reduce Only"
                  : depositsData.isBankHigh && (depositsData.isBankFilled ? "Limit Reached" : "Approaching Limit")}
              </div>

              {depositsData.isReduceOnly ? (
                <span>{depositsData.symbol} is being discontinued.</span>
              ) : (
                <>
                  <span>
                    {depositsData.symbol} {depositsData.isInLendingMode ? "deposits" : "borrows"} are at{" "}
                    {percentFormatterMod(depositsData.capacity, {
                      minFractionDigits: 0,
                      maxFractionDigits:
                        depositsData.isBankHigh && !depositsData.isBankFilled && depositsData.capacity >= 0.99 ? 4 : 2,
                    })}{" "}
                    capacity.
                  </span>
                  {!depositsData.isBankFilled && (
                    <>
                      <br />
                      <br />
                      <span>Available: {numeralFormatter(depositsData.available)}</span>
                    </>
                  )}
                </>
              )}
              <br />
              <br />
              <a href="https://docs.marginfi.com">
                <u>Learn more.</u>
              </a>
            </>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const getBankCapCell = ({ bankCap, denominationUSD }: BankCapData) => (
  <div className="flex justify-end">{denominationUSD ? usdFormatter.format(bankCap) : numeralFormatter(bankCap)}</div>
);

export const getUtilizationCell = ({ utilization }: UtilizationData) => (
  <div className="flex justify-end">{percentFormatter.format(utilization / 100)}</div>
);

export const getPositionCell = (positionData: PositionData) => {
  const selectedPositionAmount = positionData.denominationUSD ? positionData.positionUsd : positionData.positionAmount;

  return (
    <div className="w-full bg-background-gray rounded-md flex items-center gap-5 px-2 py-3">
      <dl className="flex gap-2 items-center">
        <dt className="text-accent-foreground text-xs font-light">Wallet:</dt>
        <dd>
          {positionData.denominationUSD
            ? usdFormatter.format(positionData.walletAmount * positionData.price)
            : `${numeralFormatter(positionData.walletAmount)} ${positionData.symbol}`}
        </dd>
      </dl>
      {selectedPositionAmount && (
        <dl className="flex gap-2 items-center">
          <dt className="text-accent-foreground text-xs font-light">
            {positionData.isInLendingMode ? "Lending:" : "Borrowing:"}
          </dt>
          <dd className="flex gap-1 items-center">
            {selectedPositionAmount < 0.01 && "< 0.01"}
            {selectedPositionAmount >= 0.01 &&
              (positionData.denominationUSD
                ? usdFormatter.format(selectedPositionAmount)
                : numeralFormatter(selectedPositionAmount) + " " + positionData.symbol)}
            {selectedPositionAmount < 0.01 && (
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image src="/info_icon.png" alt="info" height={12} width={12} />
                    </TooltipTrigger>
                    <TooltipContent>{selectedPositionAmount}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </dd>
        </dl>
      )}
      {positionData.liquidationPrice && (
        <dl className="flex gap-2 items-center">
          <dt
            className={cn(
              "text-accent-foreground text-xs font-light flex gap-1",
              positionData.isUserPositionPoorHealth && "text-destructive-foreground"
            )}
          >
            {positionData.isUserPositionPoorHealth && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconAlertTriangle size={16} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your account is at risk of liquidation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            Liquidation price:
          </dt>
          <dd className={cn(positionData.isUserPositionPoorHealth && "text-destructive-foreground")}>
            {positionData.liquidationPrice > 0.01
              ? usdFormatter.format(positionData.liquidationPrice)
              : `$${positionData.liquidationPrice.toExponential(2)}`}
          </dd>
        </dl>
      )}
    </div>
  );
};
