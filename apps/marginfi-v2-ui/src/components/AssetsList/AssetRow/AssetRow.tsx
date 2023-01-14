import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import Bank from "@mrgnlabs/marginfi-client-v2/src/bank";
import { TableRow, TableCell } from "@mui/material";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { BankMetadata } from "~/types";
import { AssetRowInputBox } from "./AssetRowInputBox";
import { AssetRowAction } from "./AssetRowAction";
import { AssetRowHeader } from "./AssetRowHeader";
import { AssetRowMetric } from "./AssetRowMetric";
import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

const AssetRow: FC<{
  isInLendingMode: boolean;
  isConnected: boolean;
  bank: Bank;
  bankMetadata: BankMetadata;
  marginfiAccount: MarginfiAccount | null;
  marginfiClient: MarginfiClient | null;
  reloadUserData: () => Promise<void>;
}> = ({
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

  const borrowOrLend = useCallback(async () => {
    let _marginfiAccount = marginfiAccount;
    try {
      if (isInLendingMode) {
        if (marginfiClient === null) throw Error("Marginfi client not ready");
        if (_marginfiAccount === null) {
          toast.info("Creating account");
          _marginfiAccount = await marginfiClient.createMarginfiAccount();
        }

        toast.info(`Lending ${borrowOrLendAmount}`);
        await _marginfiAccount.deposit(borrowOrLendAmount, bank);
      } else {
        if (_marginfiAccount === null)
          throw Error("Marginfi account not ready");
        toast.info(`Borrowing ${borrowOrLendAmount}`);
        await _marginfiAccount.deposit(borrowOrLendAmount, bank);
      }
    } catch (error: any) {
      toast.error(
        `Error while ${isInLendingMode ? "lending" : "borrowing"}: ${
          error.message
        }`
      );

      setBorrowOrLendAmount(0);

      try {
        await reloadUserData();
      } catch (error: any) {
        toast.error(`Error while reloading user data: ${error.message}`);
      }
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
        />
        <TableCell className="py-1 px-0 h-10 border-hidden flex justify-end items-center w-full max-w-[600px]">
          <AssetRowMetric
            longLabel="Current Price"
            shortLabel="Price"
            value="$0"
            borderRadius={
              isConnected ? "10px 0px 0px 10px" : "10px 0px 0px 10px"
            }
          />
          <AssetRowMetric
            longLabel="Total Pool Deposits"
            shortLabel="Deposits"
            value="$0"
            borderRadius={isConnected ? "" : "0px 10px 10px 0px"}
          />
          {isConnected && (
            <AssetRowMetric
              longLabel="Wallet Balance"
              shortLabel="Balance"
              value="$0"
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
                disabled={!isConnected}
              />
            </TableCell>
            <TableCell className="p-1 h-10 border-hidden flex justify-center items-center hidden md:table-cell">
              <div className="h-full w-full flex justify-center items-center">
                <AssetRowAction onClick={borrowOrLend}>
                  {isInLendingMode ? "Lend" : "Borrow"}
                </AssetRowAction>
              </div>
            </TableCell>
          </>
        )}
      </div>
    </TableRow>
  );
};

export { AssetRow };
