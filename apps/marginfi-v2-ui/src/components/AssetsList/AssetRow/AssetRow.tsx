import Image from "next/image";
import { TableCell, TableRow } from "@mui/material";
import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AssetRowInputBox } from "./AssetRowInputBox";
import { AssetRowAction } from "./AssetRowAction";
import { styled } from "@mui/material/styles";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMrgnlendStore, useUserProfileStore } from "~/store";
import Badge from "@mui/material/Badge";
import { isWholePosition } from "~/utils";
import {
  WSOL_MINT,
  groupedNumberFormatterDyn,
  numeralFormatter,
  percentFormatter,
  uiToNative,
  usdFormatter,
} from "@mrgnlabs/mrgn-common";
import {
  ExtendedBankInfo,
  Emissions,
  FEE_MARGIN,
  ActionType,
  getCurrentAction,
  ExtendedBankMetadata,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, PriceBias } from "@mrgnlabs/marginfi-client-v2";

const CLOSE_BALANCE_TOAST_ID = "close-balance";
const BORROW_OR_LEND_TOAST_ID = "borrow-or-lend";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "rgb(227, 227, 227)",
    color: "rgba(0, 0, 0, 0.87)",
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
  },
}));

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
}> = ({
  bank,
  nativeSolBalance,
  isInLendingMode,
  marginfiAccount,
  inputRefs,
  hasHotkey,
  showHotkeyBadges,
  badgeContent,
}) => {
  const [lendZoomLevel, denominationUSD] = useUserProfileStore((state) => [state.lendZoomLevel, state.denominationUSD]);
  const [mfiClient, fetchMrgnlendState] = useMrgnlendStore((state) => [state.marginfiClient, state.fetchMrgnlendState]);

  const [borrowOrLendAmount, setBorrowOrLendAmount] = useState(0);

  const isDust = useMemo(
    () => bank.isActive && uiToNative(bank.position.amount, bank.info.state.mintDecimals).isZero(),
    [bank]
  );
  const currentAction = useMemo(() => getCurrentAction(isInLendingMode, bank), [isInLendingMode, bank]);
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

  // Reset b/l amounts on toggle
  useEffect(() => {
    setBorrowOrLendAmount(0);
  }, [isInLendingMode]);

  const closeBalance = useCallback(async () => {
    if (!marginfiAccount) {
      toast.error("marginfi account not ready.");
      return;
    }

    if (!bank.isActive) {
      toast.error("no position to close.");
      return;
    }

    toast.loading("Closing dust balance", {
      toastId: CLOSE_BALANCE_TOAST_ID,
    });

    try {
      if (bank.position.isLending) {
        await marginfiAccount.withdraw(0, bank.address, true);
      } else {
        await marginfiAccount.repay(0, bank.address, true);
      }
      toast.update(CLOSE_BALANCE_TOAST_ID, {
        render: "Closing 👍",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update(CLOSE_BALANCE_TOAST_ID, {
        render: `Error while closing balance: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(`Error while closing balance`);
      console.log(error);
    }

    setBorrowOrLendAmount(0);

    toast.loading("Refreshing state", { toastId: REFRESH_ACCOUNT_TOAST_ID });
    try {
      await fetchMrgnlendState();
      toast.update(REFRESH_ACCOUNT_TOAST_ID, {
        render: "Refreshing state 👍",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update(REFRESH_ACCOUNT_TOAST_ID, {
        render: `Error while reloading state: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [bank, marginfiAccount, fetchMrgnlendState]);

  const borrowOrLend = useCallback(async () => {
    if (mfiClient === null) throw Error("Marginfi client not ready");

    if (
      currentAction === ActionType.Deposit &&
      bank.info.state.totalDeposits >= bank.info.rawBank.config.depositLimit
    ) {
      toast.error(
        `${bank.meta.tokenSymbol} deposit limit has been been reached. Additional deposits are not currently available.`
      );
      return;
    }

    if (currentAction === ActionType.Borrow && bank.info.state.totalBorrows >= bank.info.rawBank.config.borrowLimit) {
      toast.error(
        `${bank.meta.tokenSymbol} borrow limit has been been reached. Additional borrows are not currently available.`
      );
      return;
    }

    if (currentAction === ActionType.Deposit && bank.userInfo.maxDeposit === 0) {
      toast.error(`You don't have any ${bank.meta.tokenSymbol} to lend in your wallet.`);
      return;
    }

    if (currentAction === ActionType.Borrow && bank.userInfo.maxBorrow === 0) {
      toast.error(`You cannot borrow any ${bank.meta.tokenSymbol} right now.`);
      return;
    }

    if (borrowOrLendAmount <= 0) {
      toast.error("Please enter an amount over 0.");
      return;
    }

    let _marginfiAccount = marginfiAccount;

    if (nativeSolBalance < FEE_MARGIN) {
      toast.error("Not enough sol for fee.");
      return;
    }

    // -------- Create marginfi account if needed
    try {
      if (_marginfiAccount === null) {
        if (currentAction !== ActionType.Deposit) {
          toast.error("An account is required for anything operation except deposit.");
          return;
        }

        toast.loading("Creating account", {
          toastId: BORROW_OR_LEND_TOAST_ID,
        });

        _marginfiAccount = await mfiClient.createMarginfiAccount();
        toast.update(BORROW_OR_LEND_TOAST_ID, {
          render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bank.meta.tokenSymbol}`,
        });
      }
    } catch (error: any) {
      toast.update(BORROW_OR_LEND_TOAST_ID, {
        render: `Error while ${currentAction + "ing"}: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(`Error while ${currentAction + "ing"}`);
      console.log(error);
      return;
    }

    // -------- Perform relevant operation
    try {
      if (currentAction === ActionType.Deposit) {
        await _marginfiAccount.deposit(borrowOrLendAmount, bank.address);

        toast.update(BORROW_OR_LEND_TOAST_ID, {
          render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bank.meta.tokenSymbol} 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      }

      toast.loading(`${currentAction + "ing"} ${borrowOrLendAmount} ${bank.meta.tokenSymbol}`, {
        toastId: BORROW_OR_LEND_TOAST_ID,
      });
      if (_marginfiAccount === null) {
        // noinspection ExceptionCaughtLocallyJS
        throw Error("Marginfi account not ready");
      }

      if (currentAction === ActionType.Borrow) {
        await _marginfiAccount.borrow(borrowOrLendAmount, bank.address);
      } else if (currentAction === ActionType.Repay) {
        await _marginfiAccount.repay(
          borrowOrLendAmount,
          bank.address,
          bank.isActive && isWholePosition(bank, borrowOrLendAmount)
        );
      } else if (currentAction === ActionType.Withdraw) {
        await _marginfiAccount.withdraw(
          borrowOrLendAmount,
          bank.address,
          bank.isActive && isWholePosition(bank, borrowOrLendAmount)
        );
      }

      toast.update(BORROW_OR_LEND_TOAST_ID, {
        render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bank.meta.tokenSymbol} 👍`,
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update(BORROW_OR_LEND_TOAST_ID, {
        render: `Error while ${currentAction + "ing"}: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(`Error while ${currentAction + "ing"}`);
      console.log(error);
    }

    setBorrowOrLendAmount(0);

    // -------- Refresh state
    toast.loading("Refreshing state", { toastId: REFRESH_ACCOUNT_TOAST_ID });
    try {
      await fetchMrgnlendState();
      toast.update(REFRESH_ACCOUNT_TOAST_ID, {
        render: "Refreshing state 👍",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update(REFRESH_ACCOUNT_TOAST_ID, {
        render: `Error while reloading state: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [bank, borrowOrLendAmount, currentAction, marginfiAccount, mfiClient, nativeSolBalance, fetchMrgnlendState]);

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
        <HtmlTooltip
          title={
            <React.Fragment>
              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                Wide oracle price bands
              </Typography>
              {`${bank.meta.tokenSymbol} price estimates is
                ${usdFormatter.format(bank.info.state.price)} ± ${Math.max(
                bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Highest).toNumber() - bank.info.state.price,
                bank.info.state.price - bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Lowest).toNumber()
              ).toFixed(
                2
              )}, which is wide. Proceed with caution. marginfi prices assets at the bottom of confidence bands and liabilities at the top.`}
              <br />
              <a href="https://docs.marginfi.com">
                <u>Learn more.</u>
              </a>
            </React.Fragment>
          }
          placement="right"
          className={`${
            Math.max(
              bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Highest).toNumber() - bank.info.state.price,
              bank.info.state.price - bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Lowest).toNumber()
            ) >
            bank.info.state.price * 0.1
              ? "cursor-pointer"
              : "hidden"
          }`}
        >
          <Badge
            badgeContent={
              Math.max(
                bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Highest).toNumber() - bank.info.state.price,
                bank.info.state.price - bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Lowest).toNumber()
              ) >
              bank.info.state.price * 0.1
                ? "⚠️"
                : ""
            }
            className="bg-transparent"
            sx={{
              "& .MuiBadge-badge": {
                fontSize: 20,
              },
            }}
            invisible={
              Math.max(
                bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Highest).toNumber() - bank.info.state.price,
                bank.info.state.price - bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Lowest).toNumber()
              ) >
              bank.info.state.price * 0.1
                ? false
                : true
            }
          >
            {bank.info.state.price >= 0.01
              ? lendZoomLevel < 2
                ? `${usdFormatter.format(bank.info.state.price)} ± ${Math.max(
                    bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Highest).toNumber() -
                      bank.info.state.price,
                    bank.info.state.price -
                      bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Lowest).toNumber()
                  ).toFixed(2)}`
                : usdFormatter.format(bank.info.state.price)
              : `$${bank.info.state.price.toExponential(2)}`}
          </Badge>
        </HtmlTooltip>
      </TableCell>

      <TableCell
        className="border-none font-aeonik px-2"
        align="right"
        style={{
          color: isInLendingMode ? "#75BA80" : "#CF6F6F",
        }}
      >
        <div className="h-full w-full flex justify-end items-center gap-3">
          {bank.meta.tokenSymbol === "UXD" && isInLendingMode && (
            <div className="w-1/2 flex justify-center sm:justify-end">
              <HtmlTooltip
                title={
                  <React.Fragment>
                    <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                      Liquidity rewards
                    </Typography>
                    {`${percentFormatter.format(bank.info.state.lendingRate)} Supply APY + ${percentFormatter.format(
                      bank.info.state.emissionsRate
                    )} UXP rewards.`}
                    <br />
                    <a href="https://docs.marginfi.com">
                      <u>Learn more.</u>
                    </a>
                  </React.Fragment>
                }
                placement="left"
              >
                <Image src="/uxp-icon-white.png" alt="info" height={16} width={16} className="pulse" />
              </HtmlTooltip>
            </div>
          )}
          <div
            className="w-[40%] flex justify-end"
            style={{
              fontWeight: 400,
            }}
          >
            {percentFormatter.format(
              (isInLendingMode ? bank.info.state.lendingRate : bank.info.state.borrowingRate) +
                (isInLendingMode && bank.info.state.emissions == Emissions.Lending
                  ? bank.info.state.emissionsRate
                  : 0) +
                (!isInLendingMode && bank.info.state.emissions == Emissions.Borrowing
                  ? bank.info.state.emissionsRate
                  : 0)
            )}
          </div>
        </div>
      </TableCell>

      <TableCell
        className="text-white border-none font-aeonik px-2 hidden md:table-cell"
        align="right"
        style={{ fontWeight: 300 }}
      >
        {isInLendingMode
          ? bank.info.rawBank.config.assetWeightMaint.toNumber() > 0
            ? (bank.info.rawBank.config.assetWeightMaint.toNumber() * 100).toFixed(0) + "%"
            : "-"
          : ((1 / bank.info.rawBank.config.liabilityWeightInit.toNumber()) * 100).toFixed(0) + "%"}
      </TableCell>

      <TableCell
        className="text-white border-none font-aeonik px-2 hidden lg:table-cell"
        align="right"
        style={{ fontWeight: 300 }}
      >
        <HtmlTooltip
          title={
            <React.Fragment>
              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                {isInLendingMode
                  ? bank.info.state.totalDeposits >= bank.info.rawBank.config.depositLimit * 0.99999
                    ? "Limit Reached"
                    : bank.info.state.totalDeposits >= bank.info.rawBank.config.depositLimit * 0.9
                    ? "Approaching Limit"
                    : null
                  : bank.info.state.totalBorrows >= bank.info.rawBank.config.borrowLimit * 0.99999
                  ? "Limit Reached"
                  : bank.info.state.totalBorrows >= bank.info.rawBank.config.borrowLimit * 0.9
                  ? "Approaching Limit"
                  : null}
              </Typography>
              {`${bank.meta.tokenSymbol} ${isInLendingMode ? "deposits" : "borrows"} are at ${percentFormatter.format(
                isInLendingMode
                  ? bank.info.state.totalDeposits / bank.info.rawBank.config.depositLimit
                  : bank.info.state.totalBorrows / bank.info.rawBank.config.borrowLimit
              )} capacity.`}
              <br />
              <a href="https://docs.marginfi.com">
                <u>Learn more.</u>
              </a>
            </React.Fragment>
          }
          placement="right"
          className={`${
            isInLendingMode
              ? bank.info.state.totalDeposits >= bank.info.rawBank.config.depositLimit * 0.9
                ? ""
                : ""
              : bank.info.state.totalBorrows >= bank.info.rawBank.config.borrowLimit * 0.9
              ? ""
              : ""
          }`}
        >
          <Badge
            badgeContent={
              isInLendingMode
                ? bank.info.state.totalDeposits >= bank.info.rawBank.config.depositLimit * 0.99999
                  ? "💯"
                  : bank.info.state.totalDeposits >= bank.info.rawBank.config.depositLimit * 0.9
                  ? "❗"
                  : null
                : bank.info.state.totalBorrows >= bank.info.rawBank.config.borrowLimit * 0.99999
                ? "💯"
                : bank.info.state.totalBorrows >= bank.info.rawBank.config.borrowLimit * 0.9
                ? "❗"
                : null
            }
            className="bg-transparent"
            sx={{
              "& .MuiBadge-badge": {
                fontSize: 20,
              },
            }}
            invisible={
              isInLendingMode
                ? bank.info.state.totalDeposits >= bank.info.rawBank.config.depositLimit * 0.9
                  ? false
                  : true
                : bank.info.state.totalBorrows >= bank.info.rawBank.config.borrowLimit * 0.9
                ? false
                : true
            }
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
        </HtmlTooltip>
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
            ? usdFormatter.format(
                (isInLendingMode ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit) *
                  bank.info.state.price
              )
            : lendZoomLevel < 2
            ? groupedNumberFormatterDyn.format(
                isInLendingMode ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit
              )
            : numeralFormatter(
                isInLendingMode ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit
              )}
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
            disabled={isDust}
          />
        </Badge>
      </TableCell>

      <TableCell className="text-white border-none font-aeonik p-0">
        <Tooltip
          title={marginfiAccount === null ? "User account while be automatically created on first deposit" : ""}
          placement="top"
        >
          <div className="h-full w-full flex justify-end items-center ml-2 xl:ml-0 pl-2 sm:px-2">
            <AssetRowAction
              bgColor={
                currentAction === ActionType.Deposit || currentAction === ActionType.Borrow
                  ? "rgb(227, 227, 227)"
                  : "rgba(0,0,0,0)"
              }
              onClick={isDust ? closeBalance : borrowOrLend}
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
    <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>
    <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>
    <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>
    <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>
    <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>
    <TableCell className={`w-full text-white p-0 font-aeonik border-none`}>-</TableCell>
    <TableCell className="border-none p-0 w-full xl:px-4" align="right" colSpan={2}>
          <AssetRowInputBox
            tokenName={bankMetadata.tokenSymbol}
            value={0}
            setValue={() => {}}
            disabled={true}
          />
      </TableCell>
    <TableCell className="text-white border-none font-aeonik p-0">
      <div className="h-full w-full flex justify-end items-center ml-2 xl:ml-0 pl-2 sm:px-2">
        <AssetRowAction bgColor={"rgb(227, 227, 227)"}>{isInLendingMode ? "Supply" : "Borrow"}</AssetRowAction>
      </div>
    </TableCell>
  </TableRow>
);
export { AssetRow, LoadingAsset };
