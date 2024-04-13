import React from "react";

import Image from "next/image";
import Link from "next/link";
import { numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { cn, getTokenImageURL } from "~/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { IconAlertTriangle, IconPyth, IconSwitchboard } from "~/components/ui/icons";

import {
  AssetData,
  AssetPriceData,
  AssetWeightData,
  BankCapData,
  DepositsData,
  PositionData,
  RateData,
  UtilizationData,
} from "../utils";

export const EMISSION_MINT_INFO_MAP = new Map<string, { tokenSymbol: string; tokenLogoUri: string }>([
  [
    "UXD",
    {
      tokenSymbol: "UXP",
      tokenLogoUri: "/uxp-icon-white.png",
    },
  ],
  [
    "bSOL",
    {
      tokenSymbol: "BLZE",
      tokenLogoUri: "/blze.png",
    },
  ],
]);

export const getAssetCell = (asset: AssetData) => (
  <div className="flex gap-4 justify-start items-center">
    <Image
      src={getTokenImageURL(asset.symbol)}
      alt={`${asset.symbol} logo`}
      height={25}
      width={25}
      className="rounded-full"
    />
    <div>{asset.symbol}</div>
  </div>
);

export const getAssetPriceCell = ({
  oracle,
  assetPrice,
  assetPriceOffset,
  symbol,
  price,
  isOracleStale,
}: AssetPriceData) => (
  <div className="relative flex items-center justify-end gap-1.5">
    <div className="relative">
      {assetPrice >= 0.01 ? usdFormatter.format(assetPrice) : `$${assetPrice.toExponential(2)}`}
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
          <TooltipContent>
            Oracle data is stale for this bank.{" "}
            <Link
              href="https://forum.marginfi.community/t/work-were-doing-to-improve-oracle-robustness-during-chain-congestion/283"
              target="_blank"
              rel="noreferrer"
              className="underline hover:no-underline"
            >
              read more
            </Link>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </div>
);

export const getRateCell = ({ rateAPY, symbol, emissionRate, lendingRate, isInLendingMode }: RateData) => (
  <div className={cn("flex justify-end items-center gap-2", isInLendingMode ? "text-success" : "text-warning")}>
    {emissionRate > 0 && EMISSION_MINT_INFO_MAP.get(symbol) !== undefined && isInLendingMode && (
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
                  {`${percentFormatter.format(lendingRate)} Supply APY + ${percentFormatter.format(emissionRate)} ${
                    EMISSION_MINT_INFO_MAP.get(symbol)!.tokenSymbol
                  } rewards. `}
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
              <Image src={getTokenImageURL("MNDE")} alt="info" height={18} width={18} />
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col items-start gap-1.5">
                <h4 className="text-base flex items-center gap-1.5">
                  <Image src={getTokenImageURL("MNDE")} alt="info" height={18} width={18} />
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

export const getAssetWeightCell = ({ assetWeight }: AssetWeightData) => (
  <div className="flex justify-end">{!assetWeight ? <>-</> : <>{(assetWeight * 100).toFixed(0) + "%"}</>}</div>
);

export const getDepositsCell = (depositsData: DepositsData) => (
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
              {percentFormatter.format(depositsData.capacity)} capacity.
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
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

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
              "text-accent-foreground text-xs font-light",
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
