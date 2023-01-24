import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import Bank, { PriceBias } from "@mrgnlabs/marginfi-client-v2/src/bank";
import { TableCell, TableRow, Tooltip } from "@mui/material";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { TokenMetadata } from "~/types";
import { AssetRowInputBox } from "./AssetRowInputBox";
import { AssetRowAction } from "./AssetRowAction";
import { AssetRowHeader } from "./AssetRowHeader";
import { AssetRowMetric } from "./AssetRowMetric";
import { MarginfiClient, nativeToUi } from "@mrgnlabs/marginfi-client-v2";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from "~/utils/spl";
import { WSOL_MINT } from "~/config";
import { Keypair, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { groupedNumberFormatter, usdFormatter } from "~/utils/formatters";

const BORROW_OR_LEND_TOAST_ID = "borrow-or-lend";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";

const AssetRow: FC<{
  tokenBalance: number;
  nativeSol: number;
  isInLendingMode: boolean;
  isConnected: boolean;
  bank: Bank;
  tokenMetadata: TokenMetadata;
  marginfiAccount: MarginfiAccount | null;
  marginfiClient: MarginfiClient | null;
  refreshBorrowLendState: () => Promise<void>;
}> = ({
  tokenBalance,
  nativeSol,
  isInLendingMode,
  isConnected,
  bank,
  tokenMetadata,
  marginfiAccount,
  marginfiClient,
  refreshBorrowLendState,
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
    [isInLendingMode, bank]
  );

  const maxWithdraw = useMemo(
    () => marginfiAccount?.getMaxWithdrawForBank(bank).toNumber() ?? 0,
    [marginfiAccount, bank]
  );

  const walletBalance = useMemo(
    () => (bank.mint.equals(WSOL_MINT) ? tokenBalance + nativeSol : tokenBalance),
    [bank.mint, nativeSol, tokenBalance]
  );

  const { assetPrice, totalPoolDeposits, totalPoolBorrows } = useMemo(
    () => ({
      assetPrice: bank.getPrice(PriceBias.None).toNumber(),
      totalPoolDeposits: nativeToUi(bank.totalDeposits, bank.mintDecimals),
      totalPoolBorrows: nativeToUi(bank.totalLiabilities, bank.mintDecimals),
    }),
    [bank]
  );

  const borrowOrLend = useCallback(async () => {
    if (marginfiClient === null) throw Error("Marginfi client not ready");
    if (borrowOrLendAmount <= 0) {
      toast.error("Please enter an amount over 0.");
      return;
    }

    let _marginfiAccount = marginfiAccount;
    try {
      if (isInLendingMode) {
        if (_marginfiAccount === null) {
          toast.loading("Creating account", {
            toastId: BORROW_OR_LEND_TOAST_ID,
          });
          _marginfiAccount = await marginfiClient.createMarginfiAccount();
          toast.update(BORROW_OR_LEND_TOAST_ID, {
            render: `Lending ${borrowOrLendAmount} ${bank.label}`,
          });
        } else {
          toast.loading(`Lending ${borrowOrLendAmount} ${bank.label}`, {
            toastId: BORROW_OR_LEND_TOAST_ID,
          });
        }

        if (bank.mint.equals(WSOL_MINT)) {
          const ata = getAssociatedTokenAddressSync(bank.mint, _marginfiAccount.authority, false);

          let ixs: TransactionInstruction[] = [];
          let signers: Keypair[] = [];

          ixs.push(
            createAssociatedTokenAccountIdempotentInstruction(
              _marginfiAccount.authority,
              ata,
              _marginfiAccount.authority,
              bank.mint
            )
          );
          ixs.push(
            SystemProgram.transfer({
              fromPubkey: _marginfiAccount.authority,
              toPubkey: ata,
              lamports: (borrowOrLendAmount - tokenBalance) * 10 ** 9,
            })
          );
          ixs.push(createSyncNativeInstruction(ata));

          const depositIxs = await _marginfiAccount.makeDepositIx(borrowOrLendAmount, bank);
          ixs = ixs.concat(depositIxs.instructions);
          signers = signers.concat(depositIxs.keys);

          await marginfiClient.processTransaction(new Transaction().add(...ixs), signers);
        } else {
          await _marginfiAccount.deposit(borrowOrLendAmount, bank);
        }
      } else {
        toast.loading(`Borrowing ${borrowOrLendAmount} ${bank.label}`, {
          toastId: BORROW_OR_LEND_TOAST_ID,
        });
        if (_marginfiAccount === null) {
          // noinspection ExceptionCaughtLocallyJS
          throw Error("Marginfi account not ready");
        }
        await _marginfiAccount.withdraw(borrowOrLendAmount, bank);
      }
      toast.update(BORROW_OR_LEND_TOAST_ID, {
        render: "Action successful",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update(BORROW_OR_LEND_TOAST_ID, {
        render: `Error while ${isInLendingMode ? "lending" : "borrowing"}: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(`Error while ${isInLendingMode ? "lending" : "borrowing"}`);
      console.log(error);
    }

    setBorrowOrLendAmount(0);

    toast.loading("Refreshing state", { toastId: REFRESH_ACCOUNT_TOAST_ID });
    try {
      await refreshBorrowLendState();
      toast.update(REFRESH_ACCOUNT_TOAST_ID, {
        render: "Action successful",
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
    marginfiAccount,
    marginfiClient,
    isInLendingMode,
    borrowOrLendAmount,
    bank,
    refreshBorrowLendState,
    tokenBalance,
  ]);

  return (
    <TableRow className="flex justify-between items-center h-[78px] p-0 px-2 sm:p-2 lg:p-4 border-solid border-[#1C2125] border rounded-xl gap-2 lg:gap-4">
      <AssetRowHeader assetName={bank.label} apy={apy} icon={tokenMetadata.icon} isInLendingMode={isInLendingMode} />

      <TableCell className="h-full w-full flex py-1 px-0 h-10 border-hidden flex justify-center items-center w-full max-w-[600px] min-w-fit">
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
            (isInLendingMode ? totalPoolDeposits : totalPoolBorrows) * bank.getPrice(PriceBias.None).toNumber()
          )}
        />
        {isConnected && (
          <AssetRowMetric
            longLabel={isInLendingMode ? "Wallet Balance" : "Available Liquidity"}
            shortLabel={isInLendingMode ? "Wallet Balance" : "Available"}
            value={groupedNumberFormatter.format(
              isInLendingMode ? walletBalance : totalPoolDeposits - totalPoolBorrows
            )}
            borderRadius="0px 10px 10px 0px"
            usdEquivalentValue={usdFormatter.format(
              (isInLendingMode ? walletBalance : totalPoolDeposits - totalPoolBorrows) *
                bank.getPrice(PriceBias.None).toNumber()
            )}
          />
        )}
      </TableCell>

      {isConnected && (
        <TableCell className="py-1 px-0 h-10 min-w-[120px] border-hidden flex justify-center items-center hidden md:flex">
          <AssetRowInputBox
            value={borrowOrLendAmount}
            setValue={setBorrowOrLendAmount}
            maxValue={isInLendingMode ? walletBalance : maxWithdraw * 0.9}
            maxDecimals={bank.mintDecimals}
          />
        </TableCell>
      )}

      <TableCell className="p-1 h-10 border-hidden flex justify-center items-center hidden md:flex">
        <div className="h-full w-full">
          {marginfiAccount === null ? (
            <Tooltip title="User account while be automatically created on first lend" placement="top">
              <div className="h-full w-full flex justify-center items-center">
                <AssetRowAction onClick={borrowOrLend}>{isInLendingMode ? "Lend" : "Borrow"}</AssetRowAction>
              </div>
            </Tooltip>
          ) : (
            <div className="h-full w-full flex justify-center items-center">
              <AssetRowAction onClick={borrowOrLend}>{isInLendingMode ? "Lend" : "Borrow"}</AssetRowAction>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export { AssetRow };
