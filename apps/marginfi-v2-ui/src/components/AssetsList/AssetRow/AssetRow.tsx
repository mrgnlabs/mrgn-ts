import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import Bank, { PriceBias } from "@mrgnlabs/marginfi-client-v2/src/bank";
import { TableCell, TableRow, Tooltip } from "@mui/material";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ActionType, TokenMetadata, UserPosition } from "~/types";
import { AssetRowInputBox } from "./AssetRowInputBox";
import { AssetRowAction } from "./AssetRowAction";
import { AssetRowHeader } from "./AssetRowHeader";
import { AssetRowMetric } from "./AssetRowMetric";
import { MarginfiClient, nativeToUi, uiToNative } from "@mrgnlabs/marginfi-client-v2";
import { WALLET_BALANCE_MARGIN_SOL, WSOL_MINT } from "~/config";
import { Keypair, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { groupedNumberFormatter, usdFormatter } from "~/utils/formatters";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from "@mrgnlabs/marginfi-client-v2/src/utils/spl";
import { roundToDecimalPlace } from "~/utils";

const BORROW_OR_LEND_TOAST_ID = "borrow-or-lend";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";
const ACCOUNT_DETECTION_ERROR_TOAST_ID = "account-detection-error";

const AssetRow: FC<{
  tokenBalance: number;
  nativeSolBalance: number;
  isInLendingMode: boolean;
  isConnected: boolean;
  bank: Bank;
  tokenMetadata: TokenMetadata;
  marginfiAccount: MarginfiAccount | null;
  marginfiClient: MarginfiClient | null;
  refreshBorrowLendState: () => Promise<void>;
  position?: UserPosition;
}> = ({
        tokenBalance,
        nativeSolBalance,
        isInLendingMode,
        isConnected,
        bank,
        tokenMetadata,
        marginfiAccount,
        marginfiClient,
        refreshBorrowLendState,
        position,
      }) => {
  const [borrowOrLendAmount, setBorrowOrLendAmount] = useState(0);

  // Reset b/l amounts on toggle
  useEffect(() => {
    setBorrowOrLendAmount(0);
  }, [isInLendingMode]);

  const apy = useMemo(
    () =>
      isInLendingMode
        ? bank.getInterestRates().lendingRate.toNumber()
        : bank.getInterestRates().borrowingRate.toNumber(),
    [isInLendingMode, bank],
  );

  const { assetPrice, totalPoolDeposits, totalPoolBorrows } = useMemo(
    () => ({
      assetPrice: bank.getPrice(PriceBias.None).toNumber(),
      totalPoolDeposits: nativeToUi(bank.totalAssets, bank.mintDecimals),
      totalPoolBorrows: nativeToUi(bank.totalLiabilities, bank.mintDecimals),
    }),
    [bank],
  );

  const walletBalance = useMemo(
    () => (bank.mint.equals(WSOL_MINT) ? tokenBalance + nativeSolBalance : tokenBalance),
    [bank.mint, nativeSolBalance, tokenBalance],
  );

  const maxDeposit = useMemo(() => {
    if (bank.mint.equals(WSOL_MINT)) {
      return roundToDecimalPlace(Math.max(walletBalance - WALLET_BALANCE_MARGIN_SOL, 0), bank.mintDecimals);
    } else {
      return roundToDecimalPlace(walletBalance, bank.mintDecimals);
    }
  }, [bank.mint, bank.mintDecimals, walletBalance]);

  const maxWithdraw = useMemo(
    () =>
      roundToDecimalPlace(
        Math.min(marginfiAccount?.getMaxWithdrawForBank(bank).toNumber() ?? 0, totalPoolDeposits - totalPoolBorrows),
        bank.mintDecimals,
      ),
    [bank, marginfiAccount, totalPoolBorrows, totalPoolDeposits],
  );

  const maxBorrow = useMemo(
    () =>
      roundToDecimalPlace(
        Math.min(
          (marginfiAccount?.getMaxBorrowForBank(bank).toNumber() ?? 0) * 0.95,
          totalPoolDeposits - totalPoolBorrows,
        ),
        bank.mintDecimals,
      ),
    [marginfiAccount, bank, totalPoolDeposits, totalPoolBorrows],
  );

  const maxRepay = useMemo(() => {
    if (bank.mint.equals(WSOL_MINT)) {
      const walletMax = roundToDecimalPlace(Math.max(walletBalance - WALLET_BALANCE_MARGIN_SOL, 0), bank.mintDecimals);
      return !!position ? Math.min(position.amount, walletMax) : walletMax;
    } else {
      const walletMax = roundToDecimalPlace(walletBalance, bank.mintDecimals);
      return !!position ? Math.min(position.amount, walletMax) : walletMax;
    }
  }, [bank.mint, bank.mintDecimals, position, walletBalance]);

  const currentAction = useMemo(() => getCurrentAction(isInLendingMode, position), [isInLendingMode, position]);

  const maxBorrowOrLendAmount = useMemo(() => {
    switch (currentAction) {
      case ActionType.Deposit:
        return maxDeposit;
      case ActionType.Withdraw:
        return maxWithdraw;
      case ActionType.Borrow:
        return maxBorrow;
      case ActionType.Repay:
        return maxRepay;
    }
  }, [currentAction, maxBorrow, maxDeposit, maxRepay, maxWithdraw]);

  const borrowOrLend = useCallback(async () => {
    if (marginfiClient === null) throw Error("Marginfi client not ready");

    if (currentAction === ActionType.Deposit && maxDeposit === 0) {
      toast.error(`You don't have any ${bank.label} to lend in your wallet.`);
      return;
    }

    if (currentAction === ActionType.Borrow && maxBorrow === 0) {
      toast.error(`You cannot borrow any ${bank.label} right now.`);
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
            await refreshBorrowLendState();
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
          render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bank.label}`,
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
      let ixs: TransactionInstruction[] = [];
      let signers: Keypair[] = [];

      if (currentAction === ActionType.Deposit) {
        if (bank.mint.equals(WSOL_MINT)) {
          const ata = getAssociatedTokenAddressSync(bank.mint, _marginfiAccount.authority, false);

          ixs.push(
            createAssociatedTokenAccountIdempotentInstruction(
              _marginfiAccount.authority,
              ata,
              _marginfiAccount.authority,
              bank.mint,
            ),
          );
          ixs.push(
            SystemProgram.transfer({
              fromPubkey: _marginfiAccount.authority,
              toPubkey: ata,
              lamports: uiToNative(borrowOrLendAmount - tokenBalance, bank.mintDecimals).toNumber(),
            }),
          );
          ixs.push(createSyncNativeInstruction(ata));

          const depositIxs = await _marginfiAccount.makeDepositIx(borrowOrLendAmount, bank);
          ixs = ixs.concat(depositIxs.instructions);
          signers = signers.concat(depositIxs.keys);

          await marginfiClient.processTransaction(new Transaction().add(...ixs), signers);
        } else {
          await _marginfiAccount.deposit(borrowOrLendAmount, bank);
        }
        toast.update(BORROW_OR_LEND_TOAST_ID, {
          render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bank.label} 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      }

      toast.loading(`${currentAction + "ing"} ${borrowOrLendAmount} ${bank.label}`, {
        toastId: BORROW_OR_LEND_TOAST_ID,
      });
      if (_marginfiAccount === null) {
        // noinspection ExceptionCaughtLocallyJS
        throw Error("Marginfi account not ready");
      }

      if (currentAction === ActionType.Borrow) {
        await _marginfiAccount.borrow(borrowOrLendAmount, bank);
      } else if (currentAction === ActionType.Repay) {
        await _marginfiAccount.repay(borrowOrLendAmount, bank, position && borrowOrLendAmount === position.amount);
      } else if (currentAction === ActionType.Withdraw) {
        await _marginfiAccount.withdraw(borrowOrLendAmount, bank, position && borrowOrLendAmount === position.amount);
      }

      toast.update(BORROW_OR_LEND_TOAST_ID, {
        render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bank.label} 👍`,
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
      await refreshBorrowLendState();
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
  }, [
    marginfiClient,
    currentAction,
    maxDeposit,
    maxBorrow,
    borrowOrLendAmount,
    marginfiAccount,
    bank,
    refreshBorrowLendState,
    tokenBalance,
    position,
  ]);

  return (
    <TableRow
      className="h-full flex justify-between items-center h-[78px] p-0 px-4 sm:p-2 lg:p-4 border-solid border-[#1C2125] border rounded-xl gap-2 lg:gap-4">
      <AssetRowHeader assetName={bank.label} apy={apy} icon={tokenMetadata.icon} isInLendingMode={isInLendingMode} />

      <TableCell
        className="h-full w-full flex py-1 px-0 h-10 border-hidden flex justify-center items-center w-full max-w-[600px] min-w-fit">
        <AssetRowMetric
          longLabel="Current Price"
          shortLabel="Price"
          value={usdFormatter.format(assetPrice)}
          borderRadius={isConnected ? "10px 0px 0px 10px" : "10px 0px 0px 10px"}
        />
        <AssetRowMetric
          longLabel={isInLendingMode ? "Total Pool Deposits" : "Total Pool Borrows"}
          shortLabel={isInLendingMode ? "Deposits" : "Borrows"}
          value={groupedNumberFormatter.format(isInLendingMode ? totalPoolDeposits : totalPoolBorrows)}
          borderRadius={isConnected ? "" : "0px 10px 10px 0px"}
          usdEquivalentValue={usdFormatter.format(
            (isInLendingMode ? totalPoolDeposits : totalPoolBorrows) * bank.getPrice(PriceBias.None).toNumber(),
          )}
        />
        {isConnected && (
          <AssetRowMetric
            longLabel={isInLendingMode ? "Wallet Balance" : "Available Liquidity"}
            shortLabel={isInLendingMode ? "Wallet Balance" : "Available"}
            value={groupedNumberFormatter.format(
              isInLendingMode ? walletBalance : totalPoolDeposits - totalPoolBorrows,
            )}
            borderRadius="0px 10px 10px 0px"
            usdEquivalentValue={usdFormatter.format(
              (isInLendingMode ? walletBalance : totalPoolDeposits - totalPoolBorrows) *
              bank.getPrice(PriceBias.None).toNumber(),
            )}
          />
        )}
      </TableCell>

      {isConnected && (
        <TableCell className="py-1 px-0 h-10 border-hidden flex justify-center items-center">
          <AssetRowInputBox
            value={borrowOrLendAmount}
            setValue={setBorrowOrLendAmount}
            maxValue={maxBorrowOrLendAmount}
            maxDecimals={bank.mintDecimals}
          />
        </TableCell>
      )}

      <TableCell className="p-1 h-10 border-hidden flex justify-center items-center">
        <div className="h-full w-full">
          <Tooltip
            title={marginfiAccount === null ? "User account while be automatically created on first deposit" : ""}
            placement="top"
          >
            <div className="h-full w-full flex justify-center items-center">
              <AssetRowAction onClick={borrowOrLend}>{currentAction}</AssetRowAction>
            </div>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
};

function getCurrentAction(isLendingMode: boolean, position: UserPosition | undefined): ActionType {
  if (position === undefined) {
    return isLendingMode ? ActionType.Deposit : ActionType.Borrow;
  } else {
    if (position.isLending) {
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
