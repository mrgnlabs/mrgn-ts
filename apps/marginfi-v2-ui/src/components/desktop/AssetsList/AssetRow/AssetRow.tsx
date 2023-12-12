import React from "react";
import clsx from "clsx";
import Image from "next/image";
import Badge from "@mui/material/Badge";
import { TableCell, TableRow, Tooltip, Typography } from "@mui/material";

import { WSOL_MINT, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import {
  ExtendedBankInfo,
  ActiveBankInfo,
  ActionType,
  getCurrentAction,
  ExtendedBankMetadata,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, PriceBias } from "@mrgnlabs/marginfi-client-v2";
import { AssetRowAction, LSTDialogVariants, SWITCHBOARD_BANKS } from "~/components/common/AssetList";
import { ActionBoxDialog } from "~/components/common/ActionBox";

import { LendingModes } from "~/types";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { useIsMobile } from "~/hooks/useIsMobile";
import { IconAlertTriangle, IconPyth, IconSwitchboard } from "~/components/ui/icons";

import { useUserProfileStore, useUiStore } from "~/store";
import { closeBalance, executeLendingAction, MarginfiActionParams, cn } from "~/utils";

import { MrgnTooltip } from "~/components/common/MrgnTooltip";
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
]);

const REDUCE_ONLY_BANKS = ["stSOL"];

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
  const [lendingMode, isFilteredUserPositions, setSelectedToken] = useUiStore((state) => [
    state.lendingMode,
    state.isFilteredUserPositions,
    state.setSelectedToken,
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
    () =>
      bank.info.oraclePrice.priceRealtime ? bank.info.oraclePrice.priceRealtime.toNumber() : bank.info.state.price,
    [bank.info.oraclePrice.priceRealtime, bank.info.state.price]
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

  return (
    <>
      <TableRow
        data-asset-row={bank.meta.tokenSymbol.toLowerCase()}
        data-asset-row-position={activeBank?.position.amount ? "true" : "false"}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn("h-[54px] w-full transition-colors", isHovering && "bg-background-gray")}
      >
        <TableCell
          className={`text-white p-0 font-aeonik border-none`}
          style={{
            fontWeight: 300,
          }}
        >
          <div className="flex px-0 sm:px-4 gap-4 justify-center lg:justify-start items-center">
            {bank.meta.tokenLogoUri && (
              <Image src={bank.meta.tokenLogoUri} alt={bank.meta.tokenSymbol} height={25} width={25} />
            )}
            <div className="font-aeonik hidden lg:block">{bank.meta.tokenSymbol}</div>
          </div>
        </TableCell>

        <TableCell
          className={`text-white border-none px-2 font-aeonik hidden lg:table-cell`}
          align="right"
          style={{ fontWeight: 300 }}
        >
          <div className="flex items-center justify-end gap-1.5">
            <MrgnTooltip
              title={
                <React.Fragment>
                  <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                    Wide oracle price bands
                  </Typography>
                  {`${bank.meta.tokenSymbol} price estimates is
                ${usdFormatter.format(bank.info.state.price)} ± ${assetPriceOffset.toFixed(
                    2
                  )}, which is wide. Proceed with caution. marginfi prices assets at the bottom of confidence bands and liabilities at the top.`}
                  <br />
                  <a href="https://docs.marginfi.com">
                    <u>Learn more.</u>
                  </a>
                </React.Fragment>
              }
              placement="right"
              className={`${assetPriceOffset > assetPrice * 0.1 ? "cursor-pointer" : "hidden"}`}
            >
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
                {assetPrice >= 0.01
                  ? lendZoomLevel < 2
                    ? `${
                        assetPrice > 9999 ? numeralFormatter(assetPrice) : usdFormatter.format(assetPrice)
                      } ± ${assetPriceOffset.toFixed(2)}`
                    : usdFormatter.format(assetPrice)
                  : `$${assetPrice.toExponential(2)}`}
              </Badge>
            </MrgnTooltip>
            <MrgnTooltip
              title={`Powered by ${SWITCHBOARD_BANKS.includes(bank.meta.tokenSymbol) ? "Switchboard" : "Pyth"}`}
              placement="right"
            >
              <div>
                {SWITCHBOARD_BANKS.includes(bank.meta.tokenSymbol) ? (
                  <IconSwitchboard size={14} />
                ) : (
                  <IconPyth size={14} />
                )}
              </div>
            </MrgnTooltip>
          </div>
        </TableCell>

        <TableCell
          className="border-none font-aeonik px-2"
          align="right"
          style={{
            color: isInLendingMode ? "#75BA80" : "#CF6F6F",
          }}
        >
          <div className="h-full w-full flex justify-end items-center gap-3">
            {bank.info.state.emissionsRate > 0 &&
              EMISSION_MINT_INFO_MAP.get(bank.meta.tokenSymbol) !== undefined &&
              isInLendingMode && (
                <div className="w-1/2 flex justify-center sm:justify-end">
                  <MrgnTooltip
                    title={
                      <React.Fragment>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Liquidity rewards
                        </Typography>
                        {`${percentFormatter.format(
                          bank.info.state.lendingRate
                        )} Supply APY + ${percentFormatter.format(bank.info.state.emissionsRate)} ${
                          EMISSION_MINT_INFO_MAP.get(bank.meta.tokenSymbol)!.tokenSymbol
                        } rewards.`}
                        <br />
                        <a href="https://docs.marginfi.com">
                          <u>Learn more.</u>
                        </a>
                      </React.Fragment>
                    }
                    placement="left"
                  >
                    <Image
                      src={EMISSION_MINT_INFO_MAP.get(bank.meta.tokenSymbol)!.tokenLogoUri}
                      alt="info"
                      height={16}
                      width={16}
                      className="pulse"
                    />
                  </MrgnTooltip>
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
          className="text-white border-none font-aeonik px-2 hidden md:table-cell"
          align="right"
          style={{ fontWeight: 300 }}
        >
          {assetWeight}
        </TableCell>

        <TableCell
          className={clsx("text-white border-none font-aeonik px-2 hidden lg:table-cell")}
          align="right"
          style={{ fontWeight: 300 }}
        >
          <MrgnTooltip
            title={
              <React.Fragment>
                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                  {isReduceOnly ? "Reduce Only" : isBankHigh && (isBankFilled ? "Limit Reached" : "Approaching Limit")}
                </Typography>

                {isReduceOnly
                  ? "stSOL is being discontinued."
                  : `${bank.meta.tokenSymbol} ${
                      isInLendingMode ? "deposits" : "borrows"
                    } are at ${percentFormatter.format(
                      (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) /
                        bankCap.toNumber()
                    )} capacity.`}
                <br />
                <a href="https://docs.marginfi.com">
                  <u>Learn more.</u>
                </a>
              </React.Fragment>
            }
            placement="right"
            className={``}
          >
            <Badge
              badgeContent={isReduceOnly ? "‼️" : isBankHigh && isBankFilled ? "💯" : "❗"}
              className="bg-transparent"
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: 20,
                },
              }}
              invisible={!isBankHigh && !isReduceOnly}
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
                      : Math.max(
                          0,
                          Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit.toNumber()) -
                            bank.info.state.totalBorrows
                        )
                  )}
            </Badge>
          </MrgnTooltip>
        </TableCell>

        {/*******************************/}
        {/* [START]: ZOOM-BASED COLUMNS */}
        {/*******************************/}

        {lendZoomLevel < 2 && (
          <TableCell
            className="text-white border-none font-aeonik px-2 hidden xl:table-cell"
            align="right"
            style={{ fontWeight: 300 }}
          >
            {denominationUSD
              ? usdFormatter.format(bankCap.toNumber() * bank.info.state.price)
              : numeralFormatter(bankCap.toNumber())}
          </TableCell>
        )}

        {lendZoomLevel < 3 && (
          <TableCell
            className="text-white border-none font-aeonik px-2 hidden xl:table-cell"
            align="right"
            style={{ fontWeight: 300 }}
          >
            {percentFormatter.format(bank.info.state.utilizationRate / 100)}
          </TableCell>
        )}

        {/*******************************/}
        {/* [END]: ZOOM-BASED COLUMNS */}
        {/*******************************/}

        <TableCell
          className="text-white border-none font-aeonik px-2 hidden lg:table-cell"
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

        <TableCell className="text-white border-none font-aeonik py-1.5 px-0">
          <Tooltip
            title={marginfiAccount === null ? "User account will be automatically created on first deposit" : ""}
            placement="top"
          >
            <div className="flex px-0 sm:px-4 gap-4 justify-center lg:justify-end items-center">
              <ActionBoxDialog>
                <Button onClick={() => setSelectedToken(bank)} className="w-full">
                  {showCloseBalance ? "Close" : currentAction}
                </Button>
              </ActionBoxDialog>
            </div>
          </Tooltip>
        </TableCell>
      </TableRow>
      {activeBank?.position &&
        (isFilteredUserPositions || activeBank?.position.isLending === (lendingMode === LendingModes.LEND)) && (
          <TableRow
            data-asset-row={bank.meta.tokenSymbol.toLowerCase()}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={cn("h-[54px] w-full transition-colors", isHovering && "bg-background-gray")}
          >
            <TableCell
              colSpan={userPositionColSpan}
              className={`text-white p-0 font-aeonik border-none w-full`}
              style={{
                fontWeight: 300,
              }}
            >
              <div className={cn("bg-accent m-2.5 mt-1 p-4 rounded-lg", isUserPositionPoorHealth && "bg-destructive")}>
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
                      <MrgnTooltip title={<>{activeBank.position.amount}</>} placement="top">
                        <Image src="/info_icon.png" alt="info" height={12} width={12} />
                      </MrgnTooltip>
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
                      <MrgnTooltip title={<>${activeBank.position.usdValue}</>} placement="top">
                        <Image src="/info_icon.png" alt="info" height={12} width={12} />
                      </MrgnTooltip>
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
                          <MrgnTooltip title="Your account is at risk of liquidation" placement="left">
                            <IconAlertTriangle size={16} />
                          </MrgnTooltip>
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
