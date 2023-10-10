import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import { useMrgnlendStore, useUserProfileStore } from "~/store";
import Badge from "@mui/material/Badge";
import {
  WSOL_MINT,
  groupedNumberFormatterDyn,
  numeralFormatter,
  percentFormatter,
  uiToNative,
  usdFormatter,
} from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, ActionType, getCurrentAction, ExtendedBankMetadata } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, PriceBias } from "@mrgnlabs/marginfi-client-v2";
import { MrgnTooltip } from "~/components/common/MrgnTooltip";
import { AssetRowInputBox, AssetRowAction, LSTDialogVariants } from "~/components/common/AssetList";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { closeBalance, borrowOrLend } from "~/utils";

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

const AssetRow: FC<{
  bank: ExtendedBankInfo;
  nativeSolBalance: number;
  isInLendingMode: boolean;
  isConnected: boolean;
  marginfiAccount: MarginfiAccountWrapper | null;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  hasHotkey: boolean;
  showHotkeyBadges?: boolean;
  badgeContent?: string;
  showLSTDialog?: (variant: LSTDialogVariants) => void;
}> = ({
  bank,
  nativeSolBalance,
  isInLendingMode,
  marginfiAccount,
  inputRefs,
  hasHotkey,
  showHotkeyBadges,
  badgeContent,
  showLSTDialog,
}) => {
  const [lendZoomLevel, denominationUSD] = useUserProfileStore((state) => [state.lendZoomLevel, state.denominationUSD]);
  const setIsRefreshingStore = useMrgnlendStore((state) => state.setIsRefreshingStore);
  const [mfiClient, fetchMrgnlendState] = useMrgnlendStore((state) => [state.marginfiClient, state.fetchMrgnlendState]);
  const { rateAP, assetWeight, isBankFilled, isBankHigh, bankCap } = useAssetItemData({ bank, isInLendingMode });

  const assetPriceOffset = useMemo(
    () =>
      Math.max(
        bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Highest).toNumber() - bank.info.state.price,
        bank.info.state.price - bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Lowest).toNumber()
      ),
    [bank.info]
  );

  const [borrowOrLendAmount, setBorrowOrLendAmount] = useState(0);

  const currentAction: ActionType = useMemo(() => getCurrentAction(isInLendingMode, bank), [isInLendingMode, bank]);

  const maxAmount = useMemo(() => {
    switch (currentAction) {
      case ActionType.Deposit:
        return bank.userInfo.maxDeposit;
      case ActionType.Withdraw:
        return bank.userInfo.maxWithdraw;
      case ActionType.Borrow:
        return bank.userInfo.maxBorrow;
      case ActionType.Repay:
        return bank.userInfo.maxRepay;
    }
  }, [bank, currentAction]);

  const isDust = useMemo(
    () => bank.isActive && uiToNative(bank.position.amount, bank.info.state.mintDecimals).isZero(),
    [bank]
  );

  const isDisabled = useMemo(
    () =>
      (isDust &&
        uiToNative(bank.userInfo.tokenAccount.balance, bank.info.state.mintDecimals).isZero() &&
        currentAction == ActionType.Borrow) ||
      (!isDust && maxAmount === 0),
    [currentAction, bank, isDust, maxAmount]
  );

  // Reset b/l amounts on toggle
  useEffect(() => {
    setBorrowOrLendAmount(0);
  }, [isInLendingMode]);

  const handleCloseBalance = useCallback(async () => {
    try {
      await closeBalance({ marginfiAccount, bank });
    } catch (error) {
      return;
    }

    setBorrowOrLendAmount(0);

    try {
      setIsRefreshingStore(true);
      await fetchMrgnlendState();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [bank, marginfiAccount, fetchMrgnlendState, setIsRefreshingStore]);

  const handleBorrowOrLend = useCallback(async () => {
    if (
      currentAction === ActionType.Deposit &&
      (bank.meta.tokenSymbol === "SOL" || bank.meta.tokenSymbol === "stSOL") &&
      showLSTDialog
    ) {
      showLSTDialog(bank.meta.tokenSymbol as LSTDialogVariants);
      return;
    }

    await borrowOrLend({ mfiClient, currentAction, bank, borrowOrLendAmount, nativeSolBalance, marginfiAccount });

    if (
      currentAction === ActionType.Withdraw &&
      (bank.meta.tokenSymbol === "SOL" || bank.meta.tokenSymbol === "stSOL") &&
      showLSTDialog
    ) {
      showLSTDialog(bank.meta.tokenSymbol as LSTDialogVariants);
      return;
    }

    setBorrowOrLendAmount(0);

    // -------- Refresh state
    try {
      setIsRefreshingStore(true);
      await fetchMrgnlendState();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [
    bank,
    borrowOrLendAmount,
    currentAction,
    marginfiAccount,
    mfiClient,
    nativeSolBalance,
    fetchMrgnlendState,
    setIsRefreshingStore,
    showLSTDialog,
  ]);

  return (
    <TableRow className="h-[54px] w-full bg-[#171C1F] border border-[#1E2122]">
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
        className={`text-white border-none px-2 font-aeonik hidden lg:table-cell ${
          bank.info.state.price > 999 && lendZoomLevel < 2 ? "xl:text-xs xl:pl-0" : ""
        }`}
        align="right"
        style={{ fontWeight: 300 }}
      >
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
          className={`${assetPriceOffset > bank.info.state.price * 0.1 ? "cursor-pointer" : "hidden"}`}
        >
          <Badge
            badgeContent={assetPriceOffset > bank.info.state.price * 0.1 ? "⚠️" : ""}
            className="bg-transparent"
            sx={{
              "& .MuiBadge-badge": {
                fontSize: 20,
              },
            }}
            invisible={assetPriceOffset > bank.info.state.price * 0.1 ? false : true}
          >
            {bank.info.state.price >= 0.01
              ? lendZoomLevel < 2
                ? `${usdFormatter.format(bank.info.state.price)} ± ${assetPriceOffset.toFixed(2)}`
                : usdFormatter.format(bank.info.state.price)
              : `$${bank.info.state.price.toExponential(2)}`}
          </Badge>
        </MrgnTooltip>
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
                      {`${percentFormatter.format(bank.info.state.lendingRate)} Supply APY + ${percentFormatter.format(
                        bank.info.state.emissionsRate
                      )} ${EMISSION_MINT_INFO_MAP.get(bank.meta.tokenSymbol)!.tokenSymbol} rewards.`}
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
        className="text-white border-none font-aeonik px-2 hidden lg:table-cell"
        align="right"
        style={{ fontWeight: 300 }}
      >
        <MrgnTooltip
          title={
            <React.Fragment>
              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                {isBankHigh && (isBankFilled ? "Limit Reached" : "Approaching Limit")}
              </Typography>
              {`${bank.meta.tokenSymbol} ${isInLendingMode ? "deposits" : "borrows"} are at ${percentFormatter.format(
                (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) / bankCap
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
            badgeContent={isBankHigh && (isBankFilled ? "💯" : "❗")}
            className="bg-transparent"
            sx={{
              "& .MuiBadge-badge": {
                fontSize: 20,
              },
            }}
            invisible={!isBankHigh}
          >
            {denominationUSD
              ? usdFormatter.format(
                  (isInLendingMode
                    ? bank.info.state.totalDeposits
                    : Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit) -
                      bank.info.state.totalBorrows) * bank.info.state.price
                )
              : lendZoomLevel < 2
              ? groupedNumberFormatterDyn.format(
                  isInLendingMode
                    ? bank.info.state.totalDeposits
                    : Math.max(
                        0,
                        Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit) -
                          bank.info.state.totalBorrows
                      )
                )
              : numeralFormatter(
                  isInLendingMode
                    ? bank.info.state.totalDeposits
                    : Math.max(
                        0,
                        Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit) -
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
            ? usdFormatter.format(bankCap * bank.info.state.price)
            : lendZoomLevel < 2
            ? groupedNumberFormatterDyn.format(bankCap)
            : numeralFormatter(bankCap)}
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

      <TableCell className="border-none p-0 w-full xl:px-4" align="right" colSpan={2}>
        <Badge
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          sx={{
            "& .MuiBadge-badge": {
              backgroundColor: "rgb(220, 232, 93)",
              color: "#1C2125",
            },
          }}
          badgeContent={hasHotkey ? badgeContent : ""}
          invisible={hasHotkey ? !showHotkeyBadges : true}
        >
          <AssetRowInputBox
            tokenName={bank.meta.tokenSymbol}
            value={borrowOrLendAmount}
            setValue={setBorrowOrLendAmount}
            maxValue={maxAmount}
            maxDecimals={bank.info.state.mintDecimals}
            inputRefs={inputRefs}
            disabled={isDust || maxAmount === 0}
            onEnter={handleBorrowOrLend}
          />
        </Badge>
      </TableCell>

      <TableCell className="text-white border-none font-aeonik p-0">
        <Tooltip
          title={marginfiAccount === null ? "User account while be automatically created on first deposit" : ""}
          placement="top"
        >
          <div className="h-full w-full flex justify-end items-center xl:ml-0 pl-2 sm:px-2">
            <AssetRowAction
              bgColor={
                currentAction === ActionType.Deposit || currentAction === ActionType.Borrow
                  ? "rgb(227, 227, 227)"
                  : "rgba(0,0,0,0)"
              }
              onClick={isDust ? handleCloseBalance : handleBorrowOrLend}
              disabled={isDisabled}
            >
              {isDust ? "Close" : currentAction}
            </AssetRowAction>
          </div>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

const LoadingAsset: FC<{ isInLendingMode: boolean; bankMetadata: ExtendedBankMetadata }> = ({
  isInLendingMode,
  bankMetadata,
}) => (
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
    <TableCell className="border-none p-0 w-full xl:px-4" align="right" colSpan={2}>
      <AssetRowInputBox tokenName={bankMetadata.tokenSymbol} value={0} setValue={() => {}} disabled={true} />
    </TableCell>
    <TableCell className="text-white border-none font-aeonik p-0">
      <div className="h-full w-full flex justify-end items-center ml-2 xl:ml-0 pl-2 sm:px-2">
        <AssetRowAction bgColor={"rgb(227, 227, 227)"}>{isInLendingMode ? "Supply" : "Borrow"}</AssetRowAction>
      </div>
    </TableCell>
  </TableRow>
);
export { AssetRow, LoadingAsset };
