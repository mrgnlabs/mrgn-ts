import Image from "next/image";
import { MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { TableCell, TableRow } from "@mui/material";
import { FC, useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { groupedNumberFormatter, usdFormatter } from "~/utils/formatters";
import { UserPositionRowAction } from "./UserPositionRowAction";
import { UserPositionRowInputBox } from "./UserPositionRowInputBox";
import { ActiveBankInfo } from "~/types";

const WITHDRAW_OR_REPAY_TOAST_ID = "withdraw-or-repay";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";

interface UserPositionRowProps {
  activeBankInfo: ActiveBankInfo;
  marginfiAccount?: MarginfiAccount | null;
  reloadPositions: () => Promise<void>;
}

const UserPositionRow: FC<UserPositionRowProps> = ({ activeBankInfo, marginfiAccount, reloadPositions }) => {
  const [withdrawOrRepayAmount, setWithdrawOrRepayAmount] = useState(0);

  const position = useMemo(() => activeBankInfo.position, [activeBankInfo.position]);

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
          activeBankInfo.bank,
          position && withdrawOrRepayAmount === activeBankInfo.maxWithdraw
        );
      } else {
        await marginfiAccount.repay(
          withdrawOrRepayAmount,
          activeBankInfo.bank,
          position && withdrawOrRepayAmount === activeBankInfo.maxRepay
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
      await reloadPositions();
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
    activeBankInfo.bank,
    activeBankInfo.maxRepay,
    activeBankInfo.maxWithdraw,
    marginfiAccount,
    position,
    reloadPositions,
    withdrawOrRepayAmount,
  ]);

  return (
    <TableRow
      className="h-full w-full bg-[#0D0F11] border border-[#1E2122] rounded-2xl"
    >
      <TableCell
        className={
          `text-white p-0 font-aeonik border-[1px] border-${activeBankInfo.tokenName}`
        }
        style={{ fontWeight: 300 }}
      >
        <div className="flex justify-center items-center px-4 gap-4">
          {
            activeBankInfo.tokenIcon && 
            <Image
              src={activeBankInfo.tokenIcon}
              alt={activeBankInfo.tokenName}
              height={25}
              width={25}
            />
          }
          <div className="font-aeonik">{activeBankInfo.tokenName}</div>
        </div>
      </TableCell>

      <TableCell
        className="text-white border-none px-2 font-aeonik hidden sm:table-cell" align="right" style={{ fontWeight: 300 }}
      >
        {
          groupedNumberFormatter.format(position.amount)
        }
      </TableCell>

      <TableCell className="text-white border-none px-2 font-aeonik hidden md:table-cell" align="right" style={{ fontWeight: 300 }}>
        {
          usdFormatter.format(position.usdValue)
        }
      </TableCell>

      <TableCell
        className="border-none p-0 w-full"
        align="center"
        colSpan={2}
      >
        <UserPositionRowInputBox
          value={withdrawOrRepayAmount}
          setValue={setWithdrawOrRepayAmount}
          maxValue={position.isLending ? activeBankInfo.maxWithdraw : activeBankInfo.maxRepay}
          maxDecimals={activeBankInfo.tokenMintDecimals}
        />
      </TableCell>

      <TableCell
        className="text-white border-none font-aeonik p-0 px-2"
        align="right"
      >
          <div
            className="h-full w-full flex justify-end items-center"
          >
            <UserPositionRowAction onClick={withdrawOrRepay}>
              {position.isLending ? "Withdraw" : "Repay"}
            </UserPositionRowAction>
          </div>
      </TableCell>
    </TableRow>
  );
};

export { UserPositionRow };
