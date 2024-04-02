import React from "react";

import Image from "next/image";

import { getCoreRowModel, ColumnDef, flexRender, useReactTable } from "@tanstack/react-table";

import { useHotkeys } from "react-hotkeys-hook";

import { ExtendedBankInfo, ActiveBankInfo, ExtendedBankMetadata, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore, useUserProfileStore, useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { LoadingAsset, AssetRow } from "~/components/desktop/AssetsList/AssetRow";
import {
  LSTDialog,
  LSTDialogVariants,
  AssetListFilters,
  sortApRate,
  sortTvl,
  STABLECOINS,
  LSTS,
} from "~/components/common/AssetList";
import { Portfolio } from "~/components/common/Portfolio";
import { LendingModes } from "~/types";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { NewAssetRowHeader } from "./NewAssetRowHeader";
import { NewAssetRow } from "./NewAssetRow";
import { HeaderWrapper } from "./components";
import { MarginRequirementType, PriceBias, getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
import { aprToApy, nativeToUi, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { cn, getTokenImageURL, isBankOracleStale } from "~/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Badge, Typography } from "@mui/material";
import { IconAlertTriangle, IconPyth, IconSwitchboard } from "~/components/ui/icons";
import Link from "next/link";

interface BankCap {
  bankCap: number;
  isBankFilled: boolean;
  isBankHigh: boolean;
}

interface AssetPrice {
  assetPrice: number;
  assetPriceOffset: number;
}

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

export const REDUCE_ONLY_BANKS = ["stSOL"];

const getAsset = (asset: ExtendedBankMetadata) => {
  return (
    <div className="flex px-0 sm:px-4 gap-4 justify-center lg:justify-start items-center">
      <Image
        src={getTokenImageURL(asset.tokenSymbol)}
        alt={`${asset.tokenSymbol} logo`}
        height={25}
        width={25}
        className="rounded-full"
      />
      <div className="font-aeonik block">{asset.tokenSymbol}</div>
    </div>
  );
};

const getRate = (bank: ExtendedBankInfo, isInLendingMode: boolean) => {
  const { lendingRate, borrowingRate, emissions, emissionsRate } = bank.info.state;

  const interestRate = isInLendingMode ? lendingRate : borrowingRate;
  const emissionRate = isInLendingMode
    ? emissions == Emissions.Lending
      ? emissionsRate
      : 0
    : emissions == Emissions.Borrowing
    ? emissionsRate
    : 0;

  const rateAPR = interestRate + emissionRate;
  const rateAPY = aprToApy(rateAPR);

  const rateAP = percentFormatter.format(rateAPY);

  return (
    <div className="h-full w-full flex justify-end items-center gap-3">
      {bank.info.state.emissionsRate > 0 &&
        EMISSION_MINT_INFO_MAP.get(bank.meta.tokenSymbol) !== undefined &&
        isInLendingMode && (
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Image
                    src={EMISSION_MINT_INFO_MAP.get(bank.meta.tokenSymbol)!.tokenLogoUri}
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
                        src={EMISSION_MINT_INFO_MAP.get(bank.meta.tokenSymbol)!.tokenLogoUri}
                        alt="info"
                        height={18}
                        width={18}
                        className="rounded-full"
                      />{" "}
                      Liquidity rewards
                    </h4>
                    <p className="text-xs">
                      {`${percentFormatter.format(bank.info.state.lendingRate)} Supply APY + ${percentFormatter.format(
                        bank.info.state.emissionsRate
                      )} ${EMISSION_MINT_INFO_MAP.get(bank.meta.tokenSymbol)!.tokenSymbol} rewards. `}
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
      {bank.meta.tokenSymbol === "mSOL" && (
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

      <div className="w-[40%] flex justify-end">{rateAP}</div>
    </div>
  );
};

const getAssetPrice = (bank: ExtendedBankInfo) => {
  const assetPrice = getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber();

  let oracle = "";
  switch (bank.info.rawBank.config.oracleSetup) {
    case "PythEma":
      oracle = "Pyth";
      break;
    case "SwitchboardV2":
      oracle = "Switchboard";
      break;
  }

  const assetPriceOffset = Math.max(
    bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Highest).toNumber() - bank.info.state.price,
    bank.info.state.price - bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Lowest).toNumber()
  );

  return (
    <div className="flex items-center justify-end gap-1.5">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              badgeContent={assetPriceOffset > assetPrice * 0.1 ? "⚠️" : ""}
              className="bg-transparent flex items-center justify-end gap-1.5"
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: 20,
                },
              }}
              invisible={assetPriceOffset > assetPrice * 0.1 ? false : true}
            >
              {assetPrice >= 0.01 ? usdFormatter.format(assetPrice) : `$${assetPrice.toExponential(2)}`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-2">
              <h4 className="text-base">Wide oracle price bands</h4>
              {`${bank.meta.tokenSymbol} price estimates is
          ${usdFormatter.format(bank.info.state.price)} ± ${assetPriceOffset.toFixed(
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
      {isBankOracleStale(bank) && (
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

  // return {
  //   assetPrice,
  //   assetPriceOffset,
  // };
};

const getBankCap = (bank: ExtendedBankInfo, isInLendingMode: boolean, denominationUSD: boolean) => {
  const bankCap = nativeToUi(
    isInLendingMode ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
    bank.info.state.mintDecimals
  );

  const isBankFilled =
    (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.99999;

  const isBankHigh = (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.9;

  const isReduceOnly = bank?.meta?.tokenSymbol ? REDUCE_ONLY_BANKS.includes(bank.meta.tokenSymbol) : false;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "flex items-center justify-end gap-1.5 text-white",
              (isReduceOnly || isBankHigh) && "text-warning",
              isBankFilled && "text-destructive-foreground"
            )}
          >
            {denominationUSD
              ? usdFormatter.format(
                  (isInLendingMode
                    ? bank.info.state.totalDeposits
                    : Math.min(
                        bank.info.state.availableLiquidity,
                        bank.info.state.borrowCap - bank.info.state.totalBorrows
                      )) * bank.info.state.price
                )
              : numeralFormatter(
                  isInLendingMode
                    ? bank.info.state.totalDeposits
                    : Math.min(
                        bank.info.state.availableLiquidity,
                        bank.info.state.borrowCap - bank.info.state.totalBorrows
                      )
                )}

            {(isReduceOnly || isBankHigh || isBankFilled) && <IconAlertTriangle size={14} />}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-left">
          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
            {isReduceOnly ? "Reduce Only" : isBankHigh && (isBankFilled ? "Limit Reached" : "Approaching Limit")}
          </Typography>

          {isReduceOnly ? (
            <span>stSOL is being discontinued.</span>
          ) : (
            <>
              <span>
                {bank.meta.tokenSymbol} {isInLendingMode ? "deposits" : "borrows"} are at{" "}
                {percentFormatter.format(
                  (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) / bankCap
                )}{" "}
                capacity.
              </span>
              {!isBankFilled && (
                <>
                  <br />
                  <br />
                  <span>
                    Available:{" "}
                    {numeralFormatter(
                      bankCap - (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows)
                    )}
                  </span>
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
};

const getAssetWeight = (bank: ExtendedBankInfo, isInLendingMode: boolean) => {
  if (!bank?.info?.rawBank?.getAssetWeight) {
    return <>-</>;
  }
  const assetWeightInit = bank.info.rawBank
    .getAssetWeight(MarginRequirementType.Initial, bank.info.oraclePrice)
    .toNumber();

  if (assetWeightInit <= 0) {
    return <>-</>;
  }
  return isInLendingMode ? (
    <>(assetWeightInit * 100).toFixed(0) + "%"</>
  ) : (
    <>((1 / bank.info.rawBank.config.liabilityWeightInit.toNumber()) * 100).toFixed(0) + "%"</>
  );
};

export { getAsset, getAssetPrice, getBankCap, getRate };
