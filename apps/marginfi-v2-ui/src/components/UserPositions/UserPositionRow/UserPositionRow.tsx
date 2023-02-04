import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import { TableCell, TableRow } from "@mui/material";
import { FC, useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { UserPosition } from "~/types";
import { groupedNumberFormatter, usdFormatter } from "~/utils/formatters";
import { UserPositionRowAction } from "./UserPositionRowAction";
import { UserPositionRowHeader } from "./UserPositionRowHeader";
import { UserPositionRowInputBox } from "./UserPositionRowInputBox";
import { roundToDecimalPlace } from "~/utils";
import { PriceBias } from "@mrgnlabs/marginfi-client-v2/src/bank";
import { nativeToUi } from "@mrgnlabs/marginfi-client-v2";
import { WALLET_BALANCE_MARGIN_SOL, WSOL_MINT } from "~/config";

const WITHDRAW_OR_REPAY_TOAST_ID = "withdraw-or-repay";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";

interface UserPositionRowProps {
  position: UserPosition;
  tokenBalance: number;
  nativeSolBalance: number;
  marginfiAccount?: MarginfiAccount | null;
  refreshBorrowLendState: () => Promise<void>;
}

const UserPositionRow: FC<UserPositionRowProps> = ({
  position,
  marginfiAccount,
  refreshBorrowLendState,
  tokenBalance,
  nativeSolBalance,
}) => {
  const [withdrawOrRepayAmount, setWithdrawOrRepayAmount] = useState(0);

  const walletBalance = useMemo(
    () => (position.bank.mint.equals(WSOL_MINT) ? tokenBalance + nativeSolBalance : tokenBalance),
    [position.bank.mint, nativeSolBalance, tokenBalance]
  );

  const { totalPoolDeposits, totalPoolBorrows } = useMemo(
    () => ({
      assetPrice: position.bank.getPrice(PriceBias.None).toNumber(),
      totalPoolDeposits: nativeToUi(position.bank.totalAssets, position.bank.mintDecimals),
      totalPoolBorrows: nativeToUi(position.bank.totalLiabilities, position.bank.mintDecimals),
    }),
    [position.bank]
  );

  const maxWithdraw = useMemo(
    () =>
      roundToDecimalPlace(
        Math.min(
          marginfiAccount?.getMaxWithdrawForBank(position.bank).toNumber() ?? 0,
          totalPoolDeposits - totalPoolBorrows
        ),
        position.bank.mintDecimals
      ),
    [position.bank, marginfiAccount, totalPoolBorrows, totalPoolDeposits]
  );

  const maxRepay = useMemo(() => {
    if (position.bank.mint.equals(WSOL_MINT)) {
      return roundToDecimalPlace(Math.max(walletBalance - WALLET_BALANCE_MARGIN_SOL, 0), position.bank.mintDecimals);
    } else {
      return roundToDecimalPlace(walletBalance, position.bank.mintDecimals);
    }
  }, [position.bank.mint, position.bank.mintDecimals, walletBalance]);

  const withdrawOrRepay = useCallback(async () => {
    if (!marginfiAccount) {
      toast.error("marginfi account not ready.");
      return;
    }
    if (withdrawOrRepayAmount <= 0) {
      toast.error("Please enter an amount over 0.");
      return;
    }

    toast.loading(`${position.isLending ? "Withdrawing" : "Repaying"} ${withdrawOrRepayAmount}`, {
      toastId: WITHDRAW_OR_REPAY_TOAST_ID,
    });

    try {
      if (position.isLending) {
        await marginfiAccount.withdraw(
          withdrawOrRepayAmount,
          position.bank,
          position && withdrawOrRepayAmount === position.amount
        );
      } else {
        await marginfiAccount.repay(
          withdrawOrRepayAmount,
          position.bank,
          position && withdrawOrRepayAmount === position.amount
        );
      }
      toast.update(WITHDRAW_OR_REPAY_TOAST_ID, {
        render: position.isLending ? "Withdrawing 👍" : "Repaying 👍",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update(WITHDRAW_OR_REPAY_TOAST_ID, {
        render: `Error while ${position.isLending ? "withdrawing" : "repaying"}: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(`Error while ${position.isLending ? "withdrawing" : "repaying"}`);
      console.log(error);
    }

    setWithdrawOrRepayAmount(0);

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
  }, [marginfiAccount, withdrawOrRepayAmount, refreshBorrowLendState, position]);

  return (
    <TableRow className="font-aeonik w-full h-full flex justify-between items-center h-[78px] py-0 px-4 sm:p-2 lg:p-4 border-solid border-[#1C2125] border rounded-xl gap-2 lg:gap-4">
      <TableCell className="font-aeonik font-light w-full h-10 flex flex-row justify-between items-center m-0 py-1 px-0 text-white text-sm border-solid border-b-black border-b-[#00000000]">
        <UserPositionRowHeader assetName={position.assetName} icon={position.tokenMetadata.icon} />
        <div className="bg-transparent max-w-[200px] min-w-fit flex flex-col justify-evenly p-1 px-3">
          <div className=" text-sm text-[#868E95] min-w-[118px]">
            {position.isLending ? "Amount Lending" : "Amount Borrowing"}
          </div>
          <div className="font-normal text-sm text-white flex flex-row gap-1">
            {groupedNumberFormatter.format(position.amount)}
            <div className="text-[#868E95] font-light px-1 hidden lg:flex justify-center items-center text-xs rounded bg-usd-equiv">
              {usdFormatter.format(position.usdValue)}
            </div>
          </div>
        </div>
        <UserPositionRowInputBox
          value={withdrawOrRepayAmount}
          setValue={setWithdrawOrRepayAmount}
          maxValue={position.isLending ? maxWithdraw : maxRepay}
          maxDecimals={position.bank.mintDecimals}
        />
      </TableCell>

      <TableCell className="flex p-0 pr-[10px] h-full justify-end items-center sm:flex border-solid border-b-black border-b-[#00000000]">
        <UserPositionRowAction onClick={withdrawOrRepay}>
          {position.isLending ? "Withdraw" : "Repay"}
        </UserPositionRowAction>
      </TableCell>
    </TableRow>
  );
};

export { UserPositionRow };
