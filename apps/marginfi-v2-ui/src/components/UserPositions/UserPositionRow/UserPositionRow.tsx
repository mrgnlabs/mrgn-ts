import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import { TableCell, TableRow } from "@mui/material";
import { FC, useCallback, useState } from "react";
import { toast } from "react-toastify";
import { UserPosition } from "~/types";
import { groupedNumberFormatter } from "~/utils";
import { UserPositionRowAction } from "./UserPositionRowAction";
import { UserPositionRowHeader } from "./UserPositionRowHeader";
import { UserPositionRowInputBox } from "./UserPositionRowInputBox";

interface UserPositionRowProps {
  position: UserPosition;
  marginfiAccount?: MarginfiAccount | null;
  refreshBorrowLendState: () => Promise<void>;
}

const UserPositionRow: FC<UserPositionRowProps> = ({
  position,
  marginfiAccount,
  refreshBorrowLendState,
}) => {
  const [withdrawOrRepayAmount, setWithdrawOrRepayAmount] = useState(0);

  const withdrawOrRepay = useCallback(async () => {
    if (!marginfiAccount) return;
    if (withdrawOrRepayAmount <= 0) {
      toast.error("Please enter an amount over 0.");
      return;
    }

    if (marginfiAccount === null) throw Error("Marginfi account not ready");
    toast.loading(
      `${
        position.isLending ? "Withdrawing" : "Repaying"
      } ${withdrawOrRepayAmount}`,
      { toastId: "withdraw-or-repay" }
    );

    try {
      if (position.isLending) {
        await marginfiAccount.withdraw(withdrawOrRepayAmount, position.bank);
      } else {
        await marginfiAccount.deposit(withdrawOrRepayAmount, position.bank);
      }
      toast.update("withdraw-or-repay", {
        render: "Action successful",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update("borrow-or-lend", {
        render: `Error while ${
          position.isLending ? "withdrawing" : "repaying"
        }: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
    }

    setWithdrawOrRepayAmount(0);

    toast.loading("Refreshing state", { toastId: "refresh-state" });
    try {
      await refreshBorrowLendState();
      toast.update("refresh-state", {
        render: "Action successful",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update("refresh-state", {
        render: `Error while reloading state: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 2000,
        isLoading: false,
      });
    }
  }, [
    marginfiAccount,
    withdrawOrRepayAmount,
    refreshBorrowLendState,
    position,
  ]);

  return (
    <TableRow
      sx={{
        "&:last-child td, &:last-child th": {
          border: 0,
          padding: 0,
        },
      }}
      style={{
        border: "solid rgba(0,0,0,0) 2px",
        fontFamily: "Aeonik Pro",
      }}
    >
      <UserPositionRowHeader
        assetName={position.assetName}
        icon={position.tokenMetadata.icon}
      />

      <TableCell
        className="text-white text-base m-0 py-1 px-0 font-light"
        style={{
          fontFamily: "Aeonik Pro",
          borderBottom: "solid rgba(0,0,0,0) 2px",
        }}
      >
        <div className="bg-transparent w-full max-w-[200px] flex flex-col justify-evenly p-1 px-3">
          <div className="text-base text-[#868E95]">
            {position.isLending ? "Amount Supplying" : "Amount Borrowing"}
          </div>
          <div className="text-base text-white">
            {groupedNumberFormatter.format(position.amount)}
          </div>
        </div>
      </TableCell>

      <TableCell
        className="py-1 px-0 border-hidden hidden sm:table-cell"
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
