import React from "react";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import Badge from "@mui/material/Badge";
import { TableCell, TableRow, Typography } from "@mui/material";

import { WSOL_MINT, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import {
  ExtendedBankInfo,
  ActiveBankInfo,
  ActionType,
  getCurrentAction,
  ExtendedBankMetadata,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { getPriceWithConfidence, MarginfiAccountWrapper, PriceBias } from "@mrgnlabs/marginfi-client-v2";
import { AssetRowAction, LSTDialogVariants } from "~/components/common/AssetList";
import { ActionBoxDialog } from "~/components/common/ActionBox";

import { LendingModes } from "~/types";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { useIsMobile } from "~/hooks/useIsMobile";
import {
  IconAlertTriangle,
  IconAlertTriangleFilled,
  IconInfoCircle,
  IconPyth,
  IconSwitchboard,
} from "~/components/ui/icons";

import { useUserProfileStore, useUiStore } from "~/store";
import { closeBalance, executeLendingAction, MarginfiActionParams, cn } from "~/utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";

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
  [
    "LFG",
    {
      tokenSymbol: "LFG",
      tokenLogoUri: "/lfg.webp",
    },
  ],
]);

export const REDUCE_ONLY_BANKS = ["stSOL"];

const AssetRow: React.FC<{
  bank: ExtendedBankInfo;
  nativeSolBalance: number;
  isInLendingMode: boolean;
  isConnected: boolean;
  marginfiAccount: MarginfiAccountWrapper | null;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  hasHotkey: boolean;
  showHotkeyBadges?: boolean;
  badgeContent?: string;
  activeBank: ActiveBankInfo;
  showLSTDialog?: (variant: LSTDialogVariants, callback?: () => void) => void;
}> = ({
  bank,
  nativeSolBalance,
  isInLendingMode,
  marginfiAccount,
  inputRefs,
  hasHotkey,
  showHotkeyBadges,
  badgeContent,
  activeBank,
  showLSTDialog,
}) => {
  const [lendZoomLevel, denominationUSD] = useUserProfileStore((state) => [state.lendZoomLevel, state.denominationUSD]);
  const [lendingMode, setLendingMode, isFilteredUserPositions] = useUiStore((state) => [
    state.lendingMode,
    state.setLendingMode,
    state.isFilteredUserPositions,
  ]);

  const { rateAP, assetWeight, isBankFilled, isBankHigh, bankCap } = useAssetItemData({ bank, isInLendingMode });

  const isMobile = useIsMobile();

  const [isHovering, setIsHovering] = React.useState(false);

  const isReduceOnly = React.useMemo(
    () => (bank?.meta?.tokenSymbol ? REDUCE_ONLY_BANKS.includes(bank.meta.tokenSymbol) : false),
    [bank.meta.tokenSymbol]
  );

  const isUserPositionPoorHealth = React.useMemo(() => {
    if (!activeBank || !activeBank.position.liquidationPrice) {
      return false;
    }

    const alertRange = 0.05;

    if (activeBank.position.isLending) {
      return (
        activeBank.info.state.price <
        activeBank.position.liquidationPrice + activeBank.position.liquidationPrice * alertRange
      );
    } else {
      return (
        activeBank.info.state.price >
        activeBank.position.liquidationPrice - activeBank.position.liquidationPrice * alertRange
      );
    }
  }, [activeBank]);

  const userPositionColSpan = React.useMemo(() => {
    if (isMobile) {
      return 4;
    }
    if (lendZoomLevel === 3) {
      return 7;
    }
    if (lendZoomLevel === 2) {
      return 8;
    }
    return 9;
  }, [isMobile, lendZoomLevel]);

  const assetPrice = React.useMemo(
    () => getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber(),
    [bank.info.oraclePrice]
  );

  const assetPriceOffset = React.useMemo(
    () =>
      Math.max(
        bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Highest).toNumber() - bank.info.state.price,
        bank.info.state.price - bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Lowest).toNumber()
      ),
    [bank.info]
  );

  const currentAction: ActionType = React.useMemo(
    () => getCurrentAction(isInLendingMode, bank),
    [isInLendingMode, bank]
  );

  const isDust = React.useMemo(() => bank.isActive && bank.position.isDust, [bank]);
  const showCloseBalance = currentAction === ActionType.Withdraw && isDust; // Only case we should show close balance is when we are withdrawing a dust balance, since user receives 0 tokens back (vs repaying a dust balance where the input box will show the smallest unit of the token)

  const oracle = React.useMemo(() => {
    let oracleStr = "";
    switch (bank.info.rawBank.config.oracleSetup) {
      case "PythEma":
        oracleStr = "Pyth";
        break;
      case "SwitchboardV2":
        oracleStr = "Switchboard";
        break;
    }

    return oracleStr;
  }, [bank.info.rawBank.config.oracleSetup]);

  const dogWifHatRef = React.useRef<HTMLTableRowElement>(null);
  const [showDogWifHatImage, setShowDogWifHatImage] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setShowDogWifHatImage(false);
    };

    document.body.addEventListener("scroll", handleScroll);

    return () => {
      document.body.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      {bank.meta.tokenSymbol === "$WIF" && dogWifHatRef.current && (
        <Image
          src="/dogwifhat.png"
          alt="wif"
          height={25}
          width={25}
          style={{
            position: "absolute",
            zIndex: 1,
            left: dogWifHatRef.current.getBoundingClientRect().left - 6,
            top: dogWifHatRef.current.getBoundingClientRect().top - 12,
            transform: "rotate(-15deg)",
            transition: "opacity 0.2s ease-in-out",
            opacity: showDogWifHatImage ? 1 : 0,
          }}
        />
      )}
      <TableRow
        ref={bank.meta.tokenSymbol === "$WIF" ? dogWifHatRef : null}
        data-asset-row={bank.meta.tokenSymbol.toLowerCase()}
        data-asset-row-position={activeBank?.position.amount ? "true" : "false"}
        onMouseEnter={() => {
          setIsHovering(true);
          setShowDogWifHatImage(true);
        }}
        onMouseLeave={() => {
          setIsHovering(false);
          setShowDogWifHatImage(false);
        }}
        className="h-[60px] w-full transition-colors z-10"
      >
        <TableCell
          className={cn("text-white p-0 font-aeonik border-none rounded-l-md", isHovering && "bg-background-gray")}
          style={{
            fontWeight: 300,
          }}
        >
          <div className="flex px-0 sm:px-4 gap-4 justify-center lg:justify-start items-center">
            {bank.meta.tokenLogoUri && (
              <Image
                src={bank.meta.tokenLogoUri}
                alt={bank.meta.tokenSymbol}
                height={25}
                width={25}
                className="rounded-full"
              />
            )}
            <div className="font-aeonik block">{bank.meta.tokenSymbol}</div>
          </div>
        </TableCell>

        <TableCell
          className={cn("text-white border-none px-2 font-aeonik table-cell", isHovering && "bg-background-gray")}
          align="right"
          style={{ fontWeight: 300 }}
        >
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
          </div>
        </TableCell>

        <TableCell
          className={cn(
            "border-none font-aeonik px-2",
            isInLendingMode ? "text-success" : "text-destructive-foreground",
            isHovering && "bg-background-gray"
          )}
          align="right"
        >
          <div className="h-full w-full flex justify-end items-center gap-3">
            {bank.info.state.emissionsRate > 0 &&
              EMISSION_MINT_INFO_MAP.get(bank.meta.tokenSymbol) !== undefined &&
              isInLendingMode && (
                <div className="w-1/2 flex justify-center sm:justify-end">
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
                            {`${percentFormatter.format(
                              bank.info.state.lendingRate
                            )} Supply APY + ${percentFormatter.format(bank.info.state.emissionsRate)} ${
                              EMISSION_MINT_INFO_MAP.get(bank.meta.tokenSymbol)!.tokenSymbol
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
            {bank.meta.tokenSymbol === "mSOL" && (
              <div className="w-1/2 flex justify-center sm:justify-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image
                        src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey/logo.png"
                        alt="info"
                        height={18}
                        width={18}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col items-start gap-1.5">
                        <h4 className="text-base flex items-center gap-1.5">
                          <Image
                            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey/logo.png"
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

            <div
              className="w-[40%] flex justify-end"
              style={{
                fontWeight: 400,
              }}
            >
              {rateAP}
            </div>
          </div>
        </TableCell>

        <TableCell
          className={cn("text-white border-none font-aeonik px-2", isHovering && "bg-background-gray")}
          align="right"
          style={{ fontWeight: 300 }}
        >
          {assetWeight}
        </TableCell>

        <TableCell
          className={clsx("text-white border-none font-aeonik px-2", isHovering && "bg-background-gray")}
          align="right"
          style={{ fontWeight: 300 }}
        >
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
                          : Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit.toNumber()) -
                            bank.info.state.totalBorrows) * bank.info.state.price
                      )
                    : numeralFormatter(
                        isInLendingMode
                          ? bank.info.state.totalDeposits
                          : Math.min(
                              bank.info.state.availableLiquidity,
                              bank.info.state.borrowCap - bank.info.state.totalBorrows
                            )
                      )}

                  {isReduceOnly || (isBankHigh && !isBankFilled) ? (
                    <IconAlertTriangle size={16} />
                  ) : isBankFilled ? (
                    <IconAlertTriangleFilled size={16} />
                  ) : null}
                </span>
              </TooltipTrigger>
              <TooltipContent>
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
        </TableCell>

        <TableCell
          className={cn("text-white border-none font-aeonik px-2", isHovering && "bg-background-gray")}
          align="right"
          style={{ fontWeight: 300 }}
        >
          {isInLendingMode ? (
            <>{denominationUSD ? usdFormatter.format(bankCap * bank.info.state.price) : numeralFormatter(bankCap)}</>
          ) : (
            <>
              {denominationUSD
                ? usdFormatter.format(bank.info.state.totalBorrows * bank.info.state.price)
                : numeralFormatter(bank.info.state.totalBorrows)}
            </>
          )}
        </TableCell>

        <TableCell
          className={cn("text-white border-none font-aeonik px-2", isHovering && "bg-background-gray")}
          align="right"
          style={{ fontWeight: 300 }}
        >
          {percentFormatter.format(bank.info.state.utilizationRate / 100)}
        </TableCell>

        <TableCell
          className={cn("text-white border-none font-aeonik px-2 table-cell", isHovering && "bg-background-gray")}
          align="right"
          style={{ fontWeight: 300 }}
        >
          {denominationUSD
            ? usdFormatter.format(
                (bank.info.state.mint.equals(WSOL_MINT)
                  ? bank.userInfo.tokenAccount.balance + nativeSolBalance
                  : bank.userInfo.tokenAccount.balance) * bank.info.state.price
              )
            : numeralFormatter(
                bank.info.state.mint.equals(WSOL_MINT)
                  ? bank.userInfo.tokenAccount.balance + nativeSolBalance
                  : bank.userInfo.tokenAccount.balance
              )}
        </TableCell>

        <TableCell
          className={cn(
            "text-white border-none font-aeonik py-1.5 px-0 rounded-r-md",
            isHovering && "bg-background-gray"
          )}
        >
          {marginfiAccount === null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex px-0 sm:px-4 gap-4 justify-center lg:justify-end items-center">
                    <ActionBoxDialog
                      requestedToken={bank.address}
                      requestedAction={currentAction}
                      requestedLendingMode={
                        currentAction === ActionType.Repay
                          ? LendingModes.BORROW
                          : currentAction === ActionType.Withdraw
                          ? LendingModes.LEND
                          : undefined
                      }
                    >
                      <Button className="w-full">{showCloseBalance ? "Close" : currentAction}</Button>
                    </ActionBoxDialog>
                  </div>
                </TooltipTrigger>
                <TooltipContent>User account will be automatically created on first deposit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {marginfiAccount !== null && (
            <div className="flex px-0 sm:px-4 gap-4 justify-center lg:justify-end items-center">
              <ActionBoxDialog
                requestedToken={bank.address}
                requestedAction={currentAction}
                requestedLendingMode={
                  currentAction === ActionType.Repay
                    ? LendingModes.BORROW
                    : currentAction === ActionType.Withdraw
                    ? LendingModes.LEND
                    : undefined
                }
              >
                <Button className="w-full">{showCloseBalance ? "Close" : currentAction}</Button>
              </ActionBoxDialog>
            </div>
          )}
        </TableCell>
      </TableRow>
      {activeBank?.position &&
        (isFilteredUserPositions || activeBank?.position.isLending === (lendingMode === LendingModes.LEND)) && (
          <TableRow
            data-asset-row={bank.meta.tokenSymbol.toLowerCase()}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={cn("h-[54px] w-full", isHovering && "bg-background-gray")}
          >
            <TableCell
              colSpan={9}
              className={`text-white p-0 font-aeonik border-none w-full`}
              style={{
                fontWeight: 300,
              }}
            >
              <div
                className={cn(
                  "bg-background-gray m-2.5 mt-1 p-4 rounded-md",
                  isUserPositionPoorHealth && "bg-destructive"
                )}
              >
                <h3>
                  Your {isFilteredUserPositions ? (activeBank.position.isLending ? "lending " : "borrowing ") : ""}{" "}
                  position details
                </h3>
                <dl className="flex items-center text-accent-foreground mt-2 text-sm">
                  <dt className="mr-1.5">{activeBank.position.isLending ? "Lending" : "Borrowing"}</dt>
                  <dd className="mr-4 pr-4 border-accent-foreground/50 border-r text-white font-medium flex items-center gap-1.5">
                    {activeBank.position.amount < 0.01 && "< 0.01"}
                    {activeBank.position.amount >= 0.01 &&
                      numeralFormatter(activeBank.position.amount) + " " + bank.meta.tokenSymbol}
                    {activeBank.position.amount < 0.01 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Image src="/info_icon.png" alt="info" height={12} width={12} />
                          </TooltipTrigger>
                          <TooltipContent>{activeBank.position.amount}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </dd>
                  <dt className="mr-1.5">USD Value</dt>
                  <dd
                    className={cn(
                      "mr-4 text-white font-medium flex items-center gap-1.5",
                      activeBank.position.liquidationPrice &&
                        activeBank.position.liquidationPrice > 0 &&
                        "pr-4 border-accent-foreground/50 border-r"
                    )}
                  >
                    {activeBank.position.usdValue < 0.01 && "< $0.01"}
                    {activeBank.position.usdValue >= 0.01 && usdFormatter.format(activeBank.position.usdValue)}
                    {activeBank.position.usdValue < 0.01 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Image src="/info_icon.png" alt="info" height={12} width={12} />
                          </TooltipTrigger>
                          <TooltipContent>{activeBank.position.usdValue}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </dd>
                  {activeBank.position.liquidationPrice && activeBank.position.liquidationPrice > 0 && (
                    <>
                      <dt
                        className={cn(
                          "mr-1.5 flex items-center gap-1.5",
                          isUserPositionPoorHealth && "text-destructive-foreground"
                        )}
                      >
                        {isUserPositionPoorHealth && (
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
                        Liquidation price
                      </dt>
                      <dd
                        className={cn(
                          "text-white font-medium",
                          isUserPositionPoorHealth && "text-destructive-foreground"
                        )}
                      >
                        {activeBank.position.liquidationPrice > 0.01
                          ? usdFormatter.format(activeBank.position.liquidationPrice)
                          : `$${activeBank.position.liquidationPrice.toExponential(2)}`}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </TableCell>
          </TableRow>
        )}
      <TableRow className="h-2 w-full"></TableRow>
    </>
  );
};

const LoadingAsset: React.FC<{ isInLendingMode: boolean; bankMetadata: ExtendedBankMetadata }> = ({
  isInLendingMode,
  bankMetadata,
}) => (
  <>
    <TableRow className="h-[54px] w-full bg-[#171C1F] border border-[#1E2122]">
      <TableCell
        className={`w-full text-white p-0 font-aeonik border-none`}
        style={{
          fontWeight: 300,
        }}
      >
        <div className="flex px-0 sm:px-4 gap-4 justify-center lg:justify-start items-center">
          {bankMetadata.tokenLogoUri && (
            <Image src={bankMetadata.tokenLogoUri} alt={bankMetadata.tokenSymbol} height={25} width={25} />
          )}
          <div className="font-aeonik hidden lg:block">{bankMetadata.tokenSymbol}</div>
        </div>
      </TableCell>
      <TableCell className={`w-full text-white p-0 font-aeonik border-none`}></TableCell>
      <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>
      <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>
      <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>
      <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>
      <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>

      <TableCell className="border-none"></TableCell>
      <TableCell className="text-white border-none font-aeonik p-0">
        <div className="h-full w-full flex justify-end items-center ml-2 xl:ml-0 pl-2 sm:px-2">
          <AssetRowAction bgColor={"rgb(227, 227, 227)"}>{isInLendingMode ? "Supply" : "Borrow"}</AssetRowAction>
        </div>
      </TableCell>
    </TableRow>
    <TableRow className="w-full h-2"></TableRow>
  </>
);
export { AssetRow, LoadingAsset };
