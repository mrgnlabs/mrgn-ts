import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import Bank, { PriceBias } from "@mrgnlabs/marginfi-client-v2/src/bank";
import { TableRow, TableCell, Tooltip } from "@mui/material";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { BankMetadata } from "~/types";
import { AssetRowInputBox } from "./AssetRowInputBox";
import { AssetRowAction } from "./AssetRowAction";
import { AssetRowHeader } from "./AssetRowHeader";
import { AssetRowMetric } from "./AssetRowMetric";
import { MarginfiClient, nativeToUi } from "@mrgnlabs/marginfi-client-v2";
import { groupedNumberFormatter, usdFormatter } from "~/utils";

const AssetRow: FC<{
  walletBalance: number;
  isInLendingMode: boolean;
  isConnected: boolean;
  bank: Bank;
  bankMetadata: BankMetadata;
  marginfiAccount: MarginfiAccount | null;
  marginfiClient: MarginfiClient | null;
  reloadUserData: () => Promise<void>;
}> = ({
  walletBalance,
  isInLendingMode,
  isConnected,
  bank,
  bankMetadata,
  marginfiAccount,
  marginfiClient,
  reloadUserData,
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

  const { assetPrice, totalPoolDeposits } = useMemo(
    () => ({
      assetPrice: bank.getPrice(PriceBias.None).toNumber(),
      totalPoolDeposits: nativeToUi(
        bank.getAssetQuantity(bank.totalDepositShares),
        bank.mintDecimals
      ),
    }),
    [bank]
  );

  const borrowOrLend = useCallback(async () => {

    if (borrowOrLendAmount <= 0) {
      toast.error("Please enter an amount over 0.");
      return;
    }

    let _marginfiAccount = marginfiAccount;
    try {
      if (isInLendingMode) {
        if (marginfiClient === null) throw Error("Marginfi client not ready");
        if (_marginfiAccount === null) {
          toast.loading("Creating account", { toastId: "borrow-or-lend" });
          _marginfiAccount = await marginfiClient.createMarginfiAccount();
          toast.update("borrow-or-lend", {
            render: `Lending ${borrowOrLendAmount} ${bank.label}`,
          });
        } else {
          toast.loading(`Lending ${borrowOrLendAmount} ${bank.label}`, {
            toastId: "borrow-or-lend",
          });
        }

        await _marginfiAccount.deposit(borrowOrLendAmount, bank);
      } else {
        toast.loading(`Borrowing ${borrowOrLendAmount} ${bank.label}`, {
          toastId: "borrow-or-lend",
        });
        if (_marginfiAccount === null)
          throw Error("Marginfi account not ready");
        await _marginfiAccount.withdraw(borrowOrLendAmount, bank);
      }
      toast.update("borrow-or-lend", {
        render: "Action successful",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update("borrow-or-lend", {
        render: `Error while ${isInLendingMode ? "lending" : "borrowing"}: ${
          error.message
        }`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
    }

    setBorrowOrLendAmount(0);

    toast.loading("Refreshing account", { toastId: "refresh-account" });
    try {
      await reloadUserData();
      toast.update("refresh-account", {
        render: "Action successful",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.error(`Error while reloading user data: ${error.message}`);
    }
  }, [
    marginfiAccount,
    marginfiClient,
    isInLendingMode,
    borrowOrLendAmount,
    bank,
    reloadUserData,
  ]);

  return (
    <TableRow
      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
      className="border-hidden" // @todo uncomment
    >
      <div className="flex justify-between items-center h-[78px] p-0 px-2 sm:p-2 lg:p-4 border-solid border-[#1C2125] border rounded-xl gap-2 lg:gap-4">
        <AssetRowHeader
          assetName={bank.label}
          apy={apy}
          icon={bankMetadata.icon}
          isInLendingMode={isInLendingMode}
        />
        <TableCell className="py-1 px-0 h-10 border-hidden flex justify-end items-center w-full max-w-[600px]">
          <AssetRowMetric
            longLabel="Current Price"
            shortLabel="Price"
            value={usdFormatter.format(assetPrice)}
            borderRadius={
              isConnected ? "10px 0px 0px 10px" : "10px 0px 0px 10px"
            }
          />
          <AssetRowMetric
            longLabel="Total Pool Deposits"
            shortLabel="Deposits"
            value={groupedNumberFormatter.format(totalPoolDeposits)}
            borderRadius={isConnected ? "" : "0px 10px 10px 0px"}
          />
          {isConnected && (
            <AssetRowMetric
              longLabel="Wallet Balance"
              shortLabel="Balance"
              value={groupedNumberFormatter.format(walletBalance)}
              borderRadius="0px 10px 10px 0px"
            />
          )}
        </TableCell>

        {isConnected && (
          <>
            <TableCell className="py-1 px-0 h-10 min-w-[120px] border-hidden flex justify-center items-center hidden md:flex">
              <AssetRowInputBox
                value={borrowOrLendAmount}
                setValue={setBorrowOrLendAmount}
                maxValue={isInLendingMode ? walletBalance : (maxWithdraw * 0.9) }
              />
            </TableCell>
            <TableCell className="p-1 h-10 border-hidden flex justify-center items-center hidden md:table-cell">
              {marginfiAccount === null ? (
                <Tooltip
                  title="User account while be automatically created"
                  placement="top"
                >
                  <div className="h-full w-full flex justify-center items-center">
                    <AssetRowAction onClick={borrowOrLend}>
                      {isInLendingMode ? "Lend" : "Borrow"}
                    </AssetRowAction>
                  </div>
                </Tooltip>
              ) : (
                <div className="h-full w-full flex justify-center items-center">
                  <AssetRowAction onClick={borrowOrLend}>
                    {isInLendingMode ? "Lend" : "Borrow"}
                  </AssetRowAction>
                </div>
              )}
            </TableCell>
          </>
        )}
      </div>
    </TableRow>
  );
};

export { AssetRow };
