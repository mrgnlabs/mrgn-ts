import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import { TableCell, TableRow, Tooltip } from "@mui/material";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ActionType, ProductType, ExtendedBankInfo, isActiveBankInfo } from "~/types";
import { AssetRowInputBox } from "./AssetRowInputBox";
import { AssetRowAction } from "./AssetRowAction";
import { AssetRowHeader, AssetRowEnder } from "./AssetRowHeader";
import { AssetRowMetric } from "./AssetRowMetric";
import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { WSOL_MINT } from "~/config";
import { Keypair, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { groupedNumberFormatter, usdFormatter } from "~/utils/formatters";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from "@mrgnlabs/mrgn-common/src/spl";
import { uiToNative } from "@mrgnlabs/mrgn-common";

const BORROW_OR_LEND_TOAST_ID = "borrow-or-lend";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";
const ACCOUNT_DETECTION_ERROR_TOAST_ID = "account-detection-error";

// @todo currently, action for only lend & borrow is enabled
// @todo enable lock and superstake progressively
const AssetRow: FC<{
  bankInfo: ExtendedBankInfo;
  nativeSolBalance: number;
  productType: ProductType;
  isConnected: boolean;
  marginfiAccount: MarginfiAccount | null;
  marginfiClient: MarginfiClient | null;
  reloadBanks: () => Promise<void>;
}> = ({ bankInfo, nativeSolBalance, productType, isConnected, marginfiAccount, marginfiClient, reloadBanks }) => {
  const [borrowOrLendAmount, setBorrowOrLendAmount] = useState(0);

  // Reset b/l amounts on toggle
  useEffect(() => {
    setBorrowOrLendAmount(0);
  }, [productType]);

  const currentAction = useMemo(() => getCurrentAction(productType, bankInfo), [productType, bankInfo]);
  const isInLendingMode = useMemo(() => productType === ProductType.Lend ? true : false, [productType]);

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

  const borrowOrLend = useCallback(async () => {
    if (marginfiClient === null) throw Error("Marginfi client not ready");

    if (currentAction === ActionType.Deposit && bankInfo.maxDeposit === 0) {
      toast.error(`You don't have any ${bankInfo.tokenName} to lend in your wallet.`);
      return;
    }

    if (currentAction === ActionType.Borrow && bankInfo.maxBorrow === 0) {
      toast.error(`You cannot borrow any ${bankInfo.tokenName} right now.`);
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
          render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bankInfo.tokenName}`,
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
        if (bankInfo.tokenMint.equals(WSOL_MINT)) {
          const ata = getAssociatedTokenAddressSync(bankInfo.tokenMint, _marginfiAccount.authority, false);

          ixs.push(
            createAssociatedTokenAccountIdempotentInstruction(
              _marginfiAccount.authority,
              ata,
              _marginfiAccount.authority,
              bankInfo.tokenMint
            )
          );

          const tokenBalanceNative = uiToNative(bankInfo.tokenBalance, bankInfo.tokenMintDecimals);
          const borrowOrLendAmountNative = uiToNative(borrowOrLendAmount, bankInfo.tokenMintDecimals);
          const nativeSolTopUpAmount = borrowOrLendAmountNative.sub(tokenBalanceNative);
          if (nativeSolTopUpAmount.gtn(0)) {
            ixs.push(
              SystemProgram.transfer({
                fromPubkey: _marginfiAccount.authority,
                toPubkey: ata,
                lamports: BigInt(nativeSolTopUpAmount.toString()),
              })
            );
            ixs.push(createSyncNativeInstruction(ata));
          }

          const depositIxs = await _marginfiAccount.makeDepositIx(borrowOrLendAmount, bankInfo.bank);
          ixs = ixs.concat(depositIxs.instructions);
          signers = signers.concat(depositIxs.keys);

          await marginfiClient.processTransaction(new Transaction().add(...ixs), signers);
        } else {
          await _marginfiAccount.deposit(borrowOrLendAmount, bankInfo.bank);
        }
        toast.update(BORROW_OR_LEND_TOAST_ID, {
          render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bankInfo.tokenName} 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      }

      toast.loading(`${currentAction + "ing"} ${borrowOrLendAmount} ${bankInfo.tokenName}`, {
        toastId: BORROW_OR_LEND_TOAST_ID,
      });
      if (_marginfiAccount === null) {
        // noinspection ExceptionCaughtLocallyJS
        throw Error("Marginfi account not ready");
      }

      if (currentAction === ActionType.Borrow) {
        await _marginfiAccount.borrow(borrowOrLendAmount, bankInfo.bank);
      } else if (currentAction === ActionType.Repay) {
        const repayAll = isActiveBankInfo(bankInfo) ? borrowOrLendAmount === bankInfo.position.amount : false;
        await _marginfiAccount.repay(borrowOrLendAmount, bankInfo.bank, repayAll);
      } else if (currentAction === ActionType.Withdraw) {
        const withdrawAll = isActiveBankInfo(bankInfo) ? borrowOrLendAmount === bankInfo.position.amount : false;
        await _marginfiAccount.withdraw(borrowOrLendAmount, bankInfo.bank, withdrawAll);
      }

      toast.update(BORROW_OR_LEND_TOAST_ID, {
        render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bankInfo.tokenName} 👍`,
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

  const Mobile = () => (
    <TableRow className="flex sm:hidden h-full justify-between items-center min-h-[78px] sm:h-[78px] flex-col sm:flex-row p-0 px-4 sm:p-2 lg:p-4 border-solid border-[#1C2125] border rounded-xl gap-2 lg:gap-4">
      <AssetRowHeader
        assetName={bankInfo.tokenName}
        apy={isInLendingMode ? bankInfo.lendingRate : bankInfo.borrowingRate}
        icon={bankInfo.tokenIcon}
        isInLendingMode={isInLendingMode}
      />

      <TableCell
        className="h-full w-full flex py-1 px-0 mb-5 sm:mb-0 h-10 border-hidden flex justify-center items-center w-full max-w-[600px] min-w-fit"
      >
        <AssetRowMetric
          longLabel="Current Price"
          shortLabel="Price"
          value={usdFormatter.format(bankInfo.tokenPrice)}
          borderRadius={isConnected ? "10px 0px 0px 10px" : "10px 0px 0px 10px"}
        />
        <AssetRowMetric
          longLabel={isInLendingMode ? "Total Pool Deposits" : "Total Pool Borrows"}
          shortLabel={isInLendingMode ? "Deposits" : "Borrows"}
          value={groupedNumberFormatter.format(
            isInLendingMode ? bankInfo.totalPoolDeposits : bankInfo.totalPoolBorrows
          )}
          borderRadius={isConnected ? "" : "0px 10px 10px 0px"}
          usdEquivalentValue={usdFormatter.format(
            (isInLendingMode ? bankInfo.totalPoolDeposits : bankInfo.totalPoolBorrows) * bankInfo.tokenPrice
          )}
        />
        {isConnected && (
          <AssetRowMetric
            longLabel={isInLendingMode ? "Wallet Balance" : "Available Liquidity"}
            shortLabel="Available"
            value={groupedNumberFormatter.format(
              isInLendingMode
                ? bankInfo.tokenMint.equals(WSOL_MINT)
                  ? bankInfo.tokenBalance + nativeSolBalance
                  : bankInfo.tokenBalance
                : bankInfo.availableLiquidity
            )}
            borderRadius="0px 10px 10px 0px"
            usdEquivalentValue={usdFormatter.format(
              (isInLendingMode
                ? bankInfo.tokenMint.equals(WSOL_MINT)
                  ? bankInfo.tokenBalance + nativeSolBalance
                  : bankInfo.tokenBalance
                : bankInfo.availableLiquidity) * bankInfo.tokenPrice
            )}
          />
        )}
      </TableCell>

      
      {/********************************/}
      {isConnected && (
        <TableCell
          className="py-1 px-0 h-10 border-hidden flex justify-center items-center"
        >
          <AssetRowInputBox
            value={borrowOrLendAmount}
            setValue={setBorrowOrLendAmount}
            maxValue={maxAmount}
            maxDecimals={bankInfo.tokenMintDecimals}
          />
        </TableCell>
      )}
      {/********************************/}

      {/********************************/}
      {/* Action button plus tooltip */}
      <TableCell className="p-1 h-10 border-hidden flex justify-center items-center my-5 sm:my-0">
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
      {/********************************/}

    </TableRow>
  )

  const tableCellStyling = {
    [ProductType.Lock]: "min-w-[12.5%] max-w-[12.5%]",
    [ProductType.Lend]: "max-w-[14.28%]",
    [ProductType.Borrow]: "max-w-[12.5%]",
    [ProductType.Superstake]: "",
  }

  const assetRowEnderStyling = {
    [ProductType.Lock]: "max-w-[25%]",
    [ProductType.Lend]: "max-w-[28.56%]",
    [ProductType.Borrow]: "max-w-[25%]",
    [ProductType.Superstake]: "",
  }

  const DesktopTableRowLock = () => (
    <TableRow
      className="hidden sm:flex min-h-14 sm:h-14 h-full justify-between items-center flex-col sm:flex-row p-0"
    >
      <AssetRowHeader
        assetName={bankInfo.tokenName}
        icon={bankInfo.tokenIcon}
        usdPrice={usdFormatter.format(bankInfo.tokenPrice)}
        tableCellStyling={tableCellStyling[productType]}
      />
      <div
        className="h-full w-full min-w-[62.5%] flex rounded-md border border-solid border-[#1C2125] mx-2"
      >
        <TableCell
          className={`border-hidden text-white h-full w-full px-1 pl-4 flex justify-start items-center gap-1 bg-[#0D0F11] max-w-[20%] rounded-md text-base`}
          style={{
            fontFamily: "Aeonik Pro",
          }}
        >
          {/* @todo placeholder */}
          0.00%
        </TableCell>
        <TableCell
          className={`border-hidden text-white h-full w-full px-1 pl-4 flex justify-start items-center gap-1 bg-[#0D0F11] max-w-[20%] text-base`}
          style={{
            fontFamily: "Aeonik Pro",
          }}
        >
          {/* @todo placeholder */}
          ◎40,234
        </TableCell>
        <TableCell
          className={`border-hidden text-white h-full w-full px-1 pl-4 flex justify-start items-center gap-1 bg-[#0D0F11] max-w-[20%] text-base`}
          style={{
            fontFamily: "Aeonik Pro",
          }}
        >
          2 weeks
        </TableCell>
        <TableCell
          className={`border-hidden text-white h-full w-full px-1 pl-4 flex justify-start items-center gap-1 bg-[#0D0F11] max-w-[20%] text-base`}
          style={{
            fontFamily: "Aeonik Pro",
          }}
        >
          ◎234,523
        </TableCell>
        <TableCell
          className={`border-hidden text-white h-full w-full px-1 pl-4 flex justify-start items-center gap-1 bg-[#0D0F11] max-w-[20%] rounded-md text-base`}
          style={{
            fontFamily: "Aeonik Pro",
          }}
        >
          ◎421
        </TableCell>
      </div>
      <AssetRowEnder
        assetName={bankInfo.tokenName}
        icon={bankInfo.tokenIcon}
        tableCellStyling={assetRowEnderStyling[productType]}
        actionButtonOnClick={borrowOrLend}
        currentAction={currentAction}
        borrowOrLendAmount={borrowOrLendAmount}
        setBorrowOrLendAmount={setBorrowOrLendAmount}
        maxAmount={maxAmount}
        maxDecimals={bankInfo.tokenMintDecimals}
      />
    </TableRow>
  )

  const DesktopTableRowLend = () => (
    <TableRow
      className="hidden sm:flex min-h-14 sm:h-14 h-full justify-between items-center flex-col sm:flex-row p-0"
    >
      <AssetRowHeader
        assetName={bankInfo.tokenName}
        icon={bankInfo.tokenIcon}
        usdPrice={usdFormatter.format(bankInfo.tokenPrice)}
        tableCellStyling={tableCellStyling[productType]}
      />
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
    </TableRow>
  )

  const DesktopTableRowBorrow = () => (
    <TableRow
      className="hidden sm:flex min-h-14 sm:h-14 h-full justify-between items-center flex-col sm:flex-row p-0"
    >
      <AssetRowHeader
        assetName={bankInfo.tokenName}
        icon={bankInfo.tokenIcon}
        usdPrice={usdFormatter.format(bankInfo.tokenPrice)}
        tableCellStyling={tableCellStyling[productType]}
      />
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
      <TableCell
        className={`text-white h-full w-full px-0.5 lg:pr-0 flex justify-center sm:justify-evenly items-center gap-1 rounded-md ${tableCellStyling[productType]}`}
        style={{
          border: `solid #fff 1px`
        }}
      >

      </TableCell>
    </TableRow>
  )

  const TableRows = {
    [ProductType.Lock]: <DesktopTableRowLock />,
    [ProductType.Lend]: <DesktopTableRowLend />,
    [ProductType.Borrow]: <DesktopTableRowBorrow />,
    [ProductType.Superstake]: <></>,
  }

  const Desktop = () => (
    <>
      {TableRows[productType]}
    </>
  )

  return (
    <>
      <Mobile />
      <Desktop />
    </>
  );
};

function getCurrentAction(
  productType: ProductType,
  bankInfo: ExtendedBankInfo,
): ActionType {
  if (!((productType === ProductType.Lend) || (productType === ProductType.Borrow))) {
    console.log("Product type not implemented yet");
    // @todo this is a dummy return, should error
    return ActionType.Deposit;
  }

  if (!isActiveBankInfo(bankInfo)) {
    return productType === ProductType.Lend ? ActionType.Deposit : ActionType.Borrow;
  } else {
    if (bankInfo.position.isLending) {
      if (productType === ProductType.Lend) {
        return ActionType.Deposit;
      } else {
        return ActionType.Withdraw;
      }
    } else {
      if (productType === ProductType.Lend) {
        return ActionType.Repay;
      } else {
        return ActionType.Borrow;
      }
    }
  }
}

export { AssetRow };
