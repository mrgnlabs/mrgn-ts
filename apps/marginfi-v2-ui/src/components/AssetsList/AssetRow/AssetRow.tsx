import Image from "next/image";
import { TableCell, TableRow } from "@mui/material";
import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ActionType, Emissions, ExtendedBankInfo, isActiveBankInfo } from "~/types";
import { AssetRowInputBox } from "./AssetRowInputBox";
import { AssetRowAction } from "./AssetRowAction";
import { MarginfiAccount, MarginfiClient, PriceBias } from "@mrgnlabs/marginfi-client-v2";
import { numeralFormatter, usdFormatter, percentFormatter, groupedNumberFormatterDyn } from "~/utils/formatters";
import { WSOL_MINT } from "~/config";
import { styled } from "@mui/material/styles";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { lendZoomLevel, denominationUSD } from '~/state';
import { useRecoilValue } from 'recoil';
import Badge from '@mui/material/Badge';
import { isWholePosition } from "~/utils";
import { uiToNative } from "@mrgnlabs/mrgn-common";

const CLOSE_BALANCE_TOAST_ID = "close-balance";
const BORROW_OR_LEND_TOAST_ID = "borrow-or-lend";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";
const ACCOUNT_DETECTION_ERROR_TOAST_ID = "account-detection-error";

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
  bankInfo: ExtendedBankInfo;
  nativeSolBalance: number;
  isInLendingMode: boolean;
  isConnected: boolean;
  marginfiAccount: MarginfiAccount | null;
  marginfiClient: MarginfiClient | null;
  reloadBanks: () => Promise<void>;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  hasHotkey: boolean;
  showHotkeyBadges?: boolean;
  badgeContent?: string;
}> = ({ bankInfo, nativeSolBalance, isInLendingMode, marginfiAccount, marginfiClient, reloadBanks, inputRefs, hasHotkey, showHotkeyBadges, badgeContent }) => {
  const [borrowOrLendAmount, setBorrowOrLendAmount] = useState(0);
  const isDust = useMemo(() =>  bankInfo.hasActivePosition && uiToNative(bankInfo.position.amount, bankInfo.tokenMintDecimals).isZero(), [bankInfo]);

  const zoomLevel = useRecoilValue(lendZoomLevel);
  const showUSD = useRecoilValue(denominationUSD);

  // Reset b/l amounts on toggle
  useEffect(() => {
    setBorrowOrLendAmount(0);
  }, [isInLendingMode]);

  const currentAction = useMemo(() => getCurrentAction(isInLendingMode, bankInfo), [isInLendingMode, bankInfo]);

  const maxAmount = useMemo(() => {
    switch (currentAction) {
      case ActionType.Deposit:
        return bankInfo.maxDeposit;
      case ActionType.Withdraw:
        return bankInfo.maxWithdraw;
      case ActionType.Borrow:
        return bankInfo.maxBorrow;
      case ActionType.Repay:
        return bankInfo.maxRepay;
    }
  }, [bankInfo.maxBorrow, bankInfo.maxDeposit, bankInfo.maxRepay, bankInfo.maxWithdraw, currentAction]);

  const closeBalance = useCallback(async () => {
    if (!marginfiAccount) {
      toast.error("marginfi account not ready.");
      return;
    }

    if (!bankInfo.hasActivePosition) {
      toast.error("no position to close.");
      return;
    }

    toast.loading("Closing dust balance", {
      toastId: CLOSE_BALANCE_TOAST_ID,
    });

    try {
      if (bankInfo.position.isLending) {
        await marginfiAccount.withdraw(
          0,
          bankInfo.bank,
          true
        );
      } else {
        await marginfiAccount.repay(
          0,
          bankInfo.bank,
          true
        );
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
      await reloadBanks();
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
  }, [bankInfo, marginfiAccount, reloadBanks]);

  const borrowOrLend = useCallback(async () => {
    if (marginfiClient === null) throw Error("Marginfi client not ready");

    if (currentAction === ActionType.Deposit && bankInfo.totalPoolDeposits >= bankInfo.bank.config.depositLimit) {
      toast.error(`${bankInfo.tokenSymbol} deposit limit has been been reached. Additional deposits are not currently available.`)
      return;
    }

    if (currentAction === ActionType.Borrow && bankInfo.totalPoolBorrows >= bankInfo.bank.config.borrowLimit) {
      toast.error(`${bankInfo.tokenSymbol} borrow limit has been been reached. Additional borrows are not currently available.`)
      return;
    }

    if (currentAction === ActionType.Deposit && bankInfo.maxDeposit === 0) {
      toast.error(`You don't have any ${bankInfo.tokenSymbol} to lend in your wallet.`);
      return;
    }

    if (currentAction === ActionType.Borrow && bankInfo.maxBorrow === 0) {
      toast.error(`You cannot borrow any ${bankInfo.tokenSymbol} right now.`);
      return;
    }

    if (borrowOrLendAmount <= 0) {
      toast.error("Please enter an amount over 0.");
      return;
    }

    let _marginfiAccount = marginfiAccount;

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

        const userAccounts = await marginfiClient.getMarginfiAccountsForAuthority();
        if (userAccounts.length > 0) {
          toast.update(BORROW_OR_LEND_TOAST_ID, {
            render: "Uh oh, data seems out-of-sync",
            toastId: BORROW_OR_LEND_TOAST_ID,
            type: toast.TYPE.WARNING,
            autoClose: 3000,
            isLoading: false,
          });
          toast.loading("Refreshing data...", { toastId: ACCOUNT_DETECTION_ERROR_TOAST_ID });
          try {
            await reloadBanks();
            toast.update(ACCOUNT_DETECTION_ERROR_TOAST_ID, {
              render: "Refreshing data... Done. Please try again",
              type: toast.TYPE.SUCCESS,
              autoClose: 3000,
              isLoading: false,
            });
          } catch (error: any) {
            toast.update(ACCOUNT_DETECTION_ERROR_TOAST_ID, {
              render: `Error while reloading state: ${error.message}`,
              type: toast.TYPE.ERROR,
              autoClose: 5000,
              isLoading: false,
            });
            console.log("Error while reloading state");
            console.log(error);
          }
          return;
        }

        _marginfiAccount = await marginfiClient.createMarginfiAccount();
        toast.update(BORROW_OR_LEND_TOAST_ID, {
          render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bankInfo.tokenSymbol}`,
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
        await _marginfiAccount.deposit(borrowOrLendAmount, bankInfo.bank);

        toast.update(BORROW_OR_LEND_TOAST_ID, {
          render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bankInfo.tokenSymbol} 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      }

      toast.loading(`${currentAction + "ing"} ${borrowOrLendAmount} ${bankInfo.tokenSymbol}`, {
        toastId: BORROW_OR_LEND_TOAST_ID,
      });
      if (_marginfiAccount === null) {
        // noinspection ExceptionCaughtLocallyJS
        throw Error("Marginfi account not ready");
      }

      if (currentAction === ActionType.Borrow) {
        await _marginfiAccount.borrow(borrowOrLendAmount, bankInfo.bank);
      } else if (currentAction === ActionType.Repay) {
        await _marginfiAccount.repay(borrowOrLendAmount, bankInfo.bank, bankInfo.hasActivePosition && isWholePosition(bankInfo, borrowOrLendAmount));
      } else if (currentAction === ActionType.Withdraw) {
        await _marginfiAccount.withdraw(borrowOrLendAmount, bankInfo.bank, bankInfo.hasActivePosition && isWholePosition(bankInfo, borrowOrLendAmount));
      }

      toast.update(BORROW_OR_LEND_TOAST_ID, {
        render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bankInfo.tokenSymbol} 👍`,
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
      await reloadBanks();
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
  }, [bankInfo, borrowOrLendAmount, currentAction, marginfiAccount, marginfiClient, reloadBanks]);

  return (
    <TableRow className="h-full w-full bg-[#171C1F] border border-[#1E2122] rounded-2xl">
      <TableCell
        className={`text-white p-0 font-aeonik border-none`}
        style={{
          fontWeight: 300,
        }}
      >
        <div className="flex px-0 sm:px-4 gap-4 justify-center lg:justify-start items-center">
          {bankInfo.tokenIcon && <Image src={bankInfo.tokenIcon} alt={bankInfo.tokenSymbol} height={25} width={25} />}
          <div className="font-aeonik hidden lg:block">{bankInfo.tokenSymbol}</div>
        </div>
      </TableCell>
      <TableCell
        className={`text-white border-none px-2 font-aeonik hidden lg:table-cell ${
          bankInfo.tokenPrice > 999 && zoomLevel < 2 ? "xl:text-xs xl:pl-0" : ""
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
              {`${bankInfo.tokenSymbol} price estimates is
                ${usdFormatter.format(bankInfo.tokenPrice)} ± ${Math.max(
                bankInfo.bank.getPrice(PriceBias.Highest).toNumber() - bankInfo.tokenPrice,
                bankInfo.tokenPrice - bankInfo.bank.getPrice(PriceBias.Lowest).toNumber()
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
              bankInfo.bank.getPrice(PriceBias.Highest).toNumber() - bankInfo.tokenPrice,
              bankInfo.tokenPrice - bankInfo.bank.getPrice(PriceBias.Lowest).toNumber()
            ) >
            bankInfo.tokenPrice * 0.1
              ? "cursor-pointer"
              : "hidden"
          }`}
        >
          <Badge
            badgeContent={
              Math.max(
                bankInfo.bank.getPrice(PriceBias.Highest).toNumber() - bankInfo.tokenPrice,
                bankInfo.tokenPrice - bankInfo.bank.getPrice(PriceBias.Lowest).toNumber()
              ) >
              bankInfo.tokenPrice * 0.1
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
                bankInfo.bank.getPrice(PriceBias.Highest).toNumber() - bankInfo.tokenPrice,
                bankInfo.tokenPrice - bankInfo.bank.getPrice(PriceBias.Lowest).toNumber()
              ) >
              bankInfo.tokenPrice * 0.1
                ? false
                : true
            }
          >
            {bankInfo.tokenPrice >= 0.01
              ? zoomLevel < 2
                ? `${usdFormatter.format(bankInfo.tokenPrice)} ± ${Math.max(
                    bankInfo.bank.getPrice(PriceBias.Highest).toNumber() - bankInfo.tokenPrice,
                    bankInfo.tokenPrice - bankInfo.bank.getPrice(PriceBias.Lowest).toNumber()
                  ).toFixed(2)}`
                : usdFormatter.format(bankInfo.tokenPrice)
              : `$${bankInfo.tokenPrice.toExponential(2)}`}
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
          {bankInfo.tokenSymbol === "UXD" && isInLendingMode && (
            <div className="w-1/2 flex justify-center sm:justify-end">
              <HtmlTooltip
                title={
                  <React.Fragment>
                    <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                      Liquidity rewards
                    </Typography>
                    {`${percentFormatter.format(bankInfo.lendingRate)} Supply APY + ${percentFormatter.format(
                      bankInfo.emissionsRate
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
              (isInLendingMode ? bankInfo.lendingRate : bankInfo.borrowingRate) +
                (isInLendingMode && bankInfo.emissions == Emissions.Lending ? bankInfo.emissionsRate : 0) +
                (!isInLendingMode && bankInfo.emissions == Emissions.Borrowing ? bankInfo.emissionsRate : 0)
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
          ? bankInfo.bank.config.assetWeightMaint.toNumber() > 0
            ? (bankInfo.bank.config.assetWeightMaint.toNumber() * 100).toFixed(0) + "%"
            : "-"
          : ((1 / bankInfo.bank.config.liabilityWeightInit.toNumber()) * 100).toFixed(0) + "%"}
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
                  ? bankInfo.totalPoolDeposits >= bankInfo.bank.config.depositLimit * 0.99999
                    ? "Limit Reached"
                    : bankInfo.totalPoolDeposits >= bankInfo.bank.config.depositLimit * 0.9
                    ? "Approaching Limit"
                    : null
                  : bankInfo.totalPoolBorrows >= bankInfo.bank.config.borrowLimit * 0.99999
                  ? "Limit Reached"
                  : bankInfo.totalPoolBorrows >= bankInfo.bank.config.borrowLimit * 0.9
                  ? "Approaching Limit"
                  : null}
              </Typography>
              {`${bankInfo.tokenSymbol} ${isInLendingMode ? "deposits" : "borrows"} are at ${percentFormatter.format(
                isInLendingMode
                  ? bankInfo.totalPoolDeposits / bankInfo.bank.config.depositLimit
                  : bankInfo.totalPoolBorrows / bankInfo.bank.config.borrowLimit
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
              ? bankInfo.totalPoolDeposits >= bankInfo.bank.config.depositLimit * 0.9
                ? ""
                : ""
              : bankInfo.totalPoolBorrows >= bankInfo.bank.config.borrowLimit * 0.9
              ? ""
              : ""
          }`}
        >
          <Badge
            badgeContent={
              isInLendingMode
                ? bankInfo.totalPoolDeposits >= bankInfo.bank.config.depositLimit * 0.99999
                  ? "💯"
                  : bankInfo.totalPoolDeposits >= bankInfo.bank.config.depositLimit * 0.9
                  ? "❗"
                  : null
                : bankInfo.totalPoolBorrows >= bankInfo.bank.config.borrowLimit * 0.99999
                ? "💯"
                : bankInfo.totalPoolBorrows >= bankInfo.bank.config.borrowLimit * 0.9
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
                ? bankInfo.totalPoolDeposits >= bankInfo.bank.config.depositLimit * 0.9
                  ? false
                  : true
                : bankInfo.totalPoolBorrows >= bankInfo.bank.config.borrowLimit * 0.9
                ? false
                : true
            }
          >
            {showUSD
              ? usdFormatter.format(
                  (isInLendingMode
                    ? bankInfo.totalPoolDeposits
                    : Math.min(bankInfo.totalPoolDeposits, bankInfo.bank.config.borrowLimit) -
                      bankInfo.totalPoolBorrows) * bankInfo.tokenPrice
                )
              : zoomLevel < 2
              ? groupedNumberFormatterDyn.format(
                  isInLendingMode
                    ? bankInfo.totalPoolDeposits
                    : Math.max(0, Math.min(bankInfo.totalPoolDeposits, bankInfo.bank.config.borrowLimit) - bankInfo.totalPoolBorrows)
                )
              : numeralFormatter(
                  isInLendingMode
                    ? bankInfo.totalPoolDeposits
                    : Math.max(0, Math.min(bankInfo.totalPoolDeposits, bankInfo.bank.config.borrowLimit) - bankInfo.totalPoolBorrows)
                )}
          </Badge>
        </HtmlTooltip>
      </TableCell>

      {/*******************************/}
      {/* [START]: ZOOM-BASED COLUMNS */}
      {/*******************************/}

      {zoomLevel < 2 && (
        <TableCell
          className="text-white border-none font-aeonik px-2 hidden xl:table-cell"
          align="right"
          style={{ fontWeight: 300 }}
        >
          {showUSD
            ? usdFormatter.format(
                (isInLendingMode ? bankInfo.bank.config.depositLimit : bankInfo.bank.config.borrowLimit) *
                  bankInfo.tokenPrice
              )
            : zoomLevel < 2
            ? groupedNumberFormatterDyn.format(
                isInLendingMode ? bankInfo.bank.config.depositLimit : bankInfo.bank.config.borrowLimit
              )
            : numeralFormatter(isInLendingMode ? bankInfo.bank.config.depositLimit : bankInfo.bank.config.borrowLimit)}
        </TableCell>
      )}

      {zoomLevel < 3 && (
        <TableCell
          className="text-white border-none font-aeonik px-2 hidden xl:table-cell"
          align="right"
          style={{ fontWeight: 300 }}
        >
          {percentFormatter.format(bankInfo.utilizationRate / 100)}
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
        {showUSD
          ? usdFormatter.format(
              (bankInfo.tokenMint.equals(WSOL_MINT)
                ? bankInfo.tokenBalance + nativeSolBalance
                : bankInfo.tokenBalance) * bankInfo.tokenPrice
            )
          : numeralFormatter(
              bankInfo.tokenMint.equals(WSOL_MINT) ? bankInfo.tokenBalance + nativeSolBalance : bankInfo.tokenBalance
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
            tokenName={bankInfo.tokenSymbol}
            value={borrowOrLendAmount}
            setValue={setBorrowOrLendAmount}
            maxValue={maxAmount}
            maxDecimals={bankInfo.tokenMintDecimals}
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

function getCurrentAction(isLendingMode: boolean, bankInfo: ExtendedBankInfo): ActionType {
  if (!isActiveBankInfo(bankInfo)) {
    return isLendingMode ? ActionType.Deposit : ActionType.Borrow;
  } else {
    if (bankInfo.position.isLending) {
      if (isLendingMode) {
        return ActionType.Deposit;
      } else {
        return ActionType.Withdraw;
      }
    } else {
      if (isLendingMode) {
        return ActionType.Repay;
      } else {
        return ActionType.Borrow;
      }
    }
  }
}

export { AssetRow };
