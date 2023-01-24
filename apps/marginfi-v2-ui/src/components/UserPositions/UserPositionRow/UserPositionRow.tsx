import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import { TableCell, TableRow } from "@mui/material";
import { FC, useCallback, useState } from "react";
import { toast } from "react-toastify";
import { UserPosition } from "~/types";
import { groupedNumberFormatter, usdFormatter } from "~/utils/formatters";
import { UserPositionRowAction } from "./UserPositionRowAction";
import { UserPositionRowHeader } from "./UserPositionRowHeader";
import { UserPositionRowInputBox } from "./UserPositionRowInputBox";

const WITHDRAW_OR_REPAY_TOAST_ID = "withdraw-or-repay";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";

interface UserPositionRowProps {
  position: UserPosition;
  marginfiAccount?: MarginfiAccount | null;
  refreshBorrowLendState: () => Promise<void>;
}

const UserPositionRow: FC<UserPositionRowProps> = ({ position, marginfiAccount, refreshBorrowLendState }) => {
  const [withdrawOrRepayAmount, setWithdrawOrRepayAmount] = useState(0);

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
        await marginfiAccount.withdraw(withdrawOrRepayAmount, position.bank);
      } else {
        await marginfiAccount.deposit(withdrawOrRepayAmount, position.bank);
      }
      toast.update(WITHDRAW_OR_REPAY_TOAST_ID, {
        render: "Action successful",
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
    }

    setWithdrawOrRepayAmount(0);

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
    }
  }, [marginfiAccount, withdrawOrRepayAmount, refreshBorrowLendState, position]);

  return (
    <TableRow
      sx={{
        "&:last-child td, &:last-child th": {
          border: 0,
          padding: 0,
        },
      }}
      style={{
        fontFamily: "Aeonik Pro",
      }}
      className="w-full h-full flex justify-between items-center h-[78px] p-0 px-2 sm:p-2 lg:p-4 rounded-xl gap-2 lg:gap-4 border-solid border-[#1C2125] border rounded-xl"
    >
      <UserPositionRowHeader assetName={position.assetName} icon={position.tokenMetadata.icon} />

      <TableCell
        className="text-white text-sm m-0 py-1 px-0 font-light"
        style={{
          fontFamily: "Aeonik Pro",
          borderBottom: "solid rgba(0,0,0,0) 2px",
        }}
      >
        <div className="bg-transparent w-full max-w-[200px] flex flex-col justify-evenly p-1 px-3 min-w-fit">
          <div className="text-sm text-[#868E95] min-w-[125px]">
            {position.isLending ? "Amount Lending" : "Amount Borrowing"}
          </div>
          <div className="text-sm text-white flex flex-row gap-1">
            {groupedNumberFormatter.format(position.amount)}
            <div
              className="text-[#868E95] px-1 hidden lg:flex justify-center items-center text-xs"
              style={{
                backgroundColor: "rgba(113, 119, 126, 0.3)",
                borderRadius: "4px",
              }}
            >
              {usdFormatter.format(position.usdValue)}
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell
        className="py-1 px-0 h-10 min-w-[120px] border-hidden flex justify-center items-center hidden sm:flex"
        style={{
          borderBottom: "solid rgba(0,0,0,0) 2px",
        }}
      >
        <UserPositionRowInputBox
          value={withdrawOrRepayAmount}
          setValue={setWithdrawOrRepayAmount}
          maxValue={position.amount}
          maxDecimals={position.bank.mintDecimals}
        />
      </TableCell>

      <TableCell
        className="flex p-0 h-full justify-end items-center hidden sm:flex"
        style={{
          paddingRight: 10,
          borderBottom: "solid rgba(0,0,0,0) 2px",
        }}
      >
        <UserPositionRowAction onClick={withdrawOrRepay}>
          {position.isLending ? "Withdraw" : "Repay"}
        </UserPositionRowAction>
      </TableCell>
    </TableRow>
  );
};

export { UserPositionRow };
