import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import { TableCell, TableRow } from "@mui/material";
import { FC, useCallback, useState } from "react";
import { toast } from "react-toastify";
import { UserPosition } from "~/types";
import { UserPositionRowAction } from "./UserPositionRowAction";
import { UserPositionRowHeader } from "./UserPositionRowHeader";
import { UserPositionRowInputBox } from "./UserPositionRowInputBox";

interface UserPositionRowProps {
  position: UserPosition;
  marginfiAccount?: MarginfiAccount | null;
  reloadUserData: () => Promise<void>;
}

const UserPositionRow: FC<UserPositionRowProps> = ({
  position,
  marginfiAccount,
  reloadUserData,
}) => {
  const [withdrawOrRepayAmount, setWithdrawOrRepayAmount] = useState(0);

  const withdrawOrRepay = useCallback(async () => {
    if (!marginfiAccount) return;
    if (marginfiAccount === null) throw Error("Marginfi account not ready");
    toast.info(
      `${
        position.isLending ? "Withdrawing" : "Repaying"
      } ${withdrawOrRepayAmount}`
    );

    try {
      if (position.isLending) {
        await marginfiAccount.withdraw(withdrawOrRepayAmount, position.bank);
      } else {
        await marginfiAccount.deposit(withdrawOrRepayAmount, position.bank);
      }
    } catch (error: any) {
      toast.error(
        `Error while ${position.isLending ? "withdrawing" : "repaying"}: ${
          error.message
        }`
      );
    }

    setWithdrawOrRepayAmount(0);

    try {
      await reloadUserData();
    } catch (error: any) {
      toast.error(`Error while reloading user data: ${error.message}`);
    }
  }, [marginfiAccount, withdrawOrRepayAmount, reloadUserData, position]);

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
      }}
    >
      <UserPositionRowHeader
        assetName={position.assetName}
        icon={position.tokenMetadata.icon}
      />

      <TableCell
        className="text-white text-xs m-0 py-1 px-0 font-light"
        style={{
          fontFamily: "Aeonik Pro",
          borderBottom: "solid rgba(0,0,0,0) 2px",
        }}
      >
        <div className="bg-transparent w-full max-w-[200px] flex flex-col justify-evenly p-1 px-3">
          <div className="text-xs text-[#868E95]">
            {position.isLending ? "Amount Supplying" : "Amount Borrowing"}
          </div>
          <div className="text-xs text-white">
            {position.amount.toFixed(position.bank.mintDecimals)}
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
        <UserPositionRowAction
          onClick={withdrawOrRepay}
          disabled={withdrawOrRepayAmount === 0}
        >
          {position.isLending ? "Withdraw" : "Repay"}
        </UserPositionRowAction>
      </TableCell>
    </TableRow>
  );
};

export { UserPositionRow };
