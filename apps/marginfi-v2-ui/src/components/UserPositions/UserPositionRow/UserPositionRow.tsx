import Image from "next/image";
import { MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { TableCell, TableRow } from "@mui/material";
import { FC, useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { groupedNumberFormatter, usdFormatter } from "~/utils/formatters";
import { UserPositionRowAction } from "./UserPositionRowAction";
import { UserPositionRowInputBox } from "./UserPositionRowInputBox";
import { ActiveBankInfo } from "~/types";
import { uiToNative } from "@mrgnlabs/mrgn-common";
import { isWholePosition } from "~/utils";

const CLOSE_BALANCE_TOAST_ID = "close-balance";
const WITHDRAW_OR_REPAY_TOAST_ID = "withdraw-or-repay";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";

interface UserPositionRowProps {
  activeBankInfo: ActiveBankInfo;
  marginfiAccount?: MarginfiAccount | null;
  reloadPositions: () => Promise<void>;
}

const UserPositionRow: FC<UserPositionRowProps> = ({ activeBankInfo, marginfiAccount, reloadPositions }) => {
  const [withdrawOrRepayAmount, setWithdrawOrRepayAmount] = useState(0);

  const isDust = useMemo(
    () => uiToNative(activeBankInfo.position.amount, activeBankInfo.tokenMintDecimals).isZero(),
    [activeBankInfo]
  );

  const closeBalance = useCallback(async () => {
    if (!marginfiAccount) {
      toast.error("marginfi account not ready.");
      return;
    }

    toast.loading("Closing dust balance", {
      toastId: CLOSE_BALANCE_TOAST_ID,
    });

    try {
      if (activeBankInfo.position.isLending) {
        await marginfiAccount.withdraw(0, activeBankInfo.bank, true);
      } else {
        await marginfiAccount.repay(0, activeBankInfo.bank, true);
      }
      toast.update(CLOSE_BALANCE_TOAST_ID, {
        render: "Closing 👍",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update(CLOSE_BALANCE_TOAST_ID, {
        render: `Error while closing balance: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(`Error while closing balance`);
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
  }, [activeBankInfo, marginfiAccount, reloadPositions]);

  const withdrawOrRepay = useCallback(async () => {
    if (!marginfiAccount) {
      toast.error("marginfi account not ready.");
      return;
    }
    if (withdrawOrRepayAmount <= 0) {
      toast.error("Please enter an amount over 0.");
      return;
    }

    toast.loading(`${activeBankInfo.position.isLending ? "Withdrawing" : "Repaying"} ${withdrawOrRepayAmount}`, {
      toastId: WITHDRAW_OR_REPAY_TOAST_ID,
    });

    try {
      if (activeBankInfo.position.isLending) {
        await marginfiAccount.withdraw(
          withdrawOrRepayAmount,
          activeBankInfo.bank,
          isWholePosition(activeBankInfo, withdrawOrRepayAmount)
        );
      } else {
        await marginfiAccount.repay(
          withdrawOrRepayAmount,
          activeBankInfo.bank,
          isWholePosition(activeBankInfo, withdrawOrRepayAmount)
        );
      }
      toast.update(WITHDRAW_OR_REPAY_TOAST_ID, {
        render: activeBankInfo.position.isLending ? "Withdrawing 👍" : "Repaying 👍",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update(WITHDRAW_OR_REPAY_TOAST_ID, {
        render: `Error while ${activeBankInfo.position.isLending ? "withdrawing" : "repaying"}: ${error.message}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(`Error while ${activeBankInfo.position.isLending ? "withdrawing" : "repaying"}`);
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
  }, [activeBankInfo, marginfiAccount, reloadPositions, withdrawOrRepayAmount]);

  return (
    <TableRow className="h-full w-full bg-[#171C1F] border border-[#1E2122] rounded-2xl">
      <TableCell className={`text-white p-0 font-aeonik border-[1px] border-none`}>
        <div className="flex justify-center items-center px-4 gap-2">
          {activeBankInfo.tokenIcon && (
            <Image src={activeBankInfo.tokenIcon} alt={activeBankInfo.tokenSymbol} height={25} width={25} />
          )}
          <div className="font-aeonik">{activeBankInfo.tokenSymbol}</div>
        </div>
      </TableCell>

      <TableCell
        className="text-white border-none px-2 font-aeonik hidden sm:table-cell"
        align="right"
        style={{ fontWeight: 300 }}
      >
        {groupedNumberFormatter.format(activeBankInfo.position.amount)}
      </TableCell>

      <TableCell
        className="text-white border-none px-2 font-aeonik hidden md:table-cell"
        align="right"
        style={{ fontWeight: 300 }}
      >
        {usdFormatter.format(activeBankInfo.position.weightedUSDValue)}
      </TableCell>

      <TableCell
        className="text-white border-none px-2 font-aeonik hidden md:table-cell"
        align="right"
        style={{ fontWeight: 300 }}
      >
        {usdFormatter.format(activeBankInfo.position.usdValue)}
      </TableCell>

      <TableCell className="p-0 w-full pl-4 sm:pl-0 border-none" align="center" colSpan={2}>
        <UserPositionRowInputBox
          value={withdrawOrRepayAmount}
          setValue={setWithdrawOrRepayAmount}
          maxValue={activeBankInfo.position.isLending ? activeBankInfo.maxWithdraw : activeBankInfo.maxRepay}
          maxDecimals={activeBankInfo.tokenMintDecimals}
          disabled={isDust}
        />
      </TableCell>

      <TableCell className="text-white font-aeonik p-0 border-none" align="right">
        <div className="h-full w-full flex justify-end items-center ml-2 xl:ml-0 pl-2 sm:px-2">
          <UserPositionRowAction onClick={isDust ? closeBalance : withdrawOrRepay}>
            {isDust ? "Close" : activeBankInfo.position.isLending ? "Withdraw" : "Repay"}
          </UserPositionRowAction>
        </div>
      </TableCell>
    </TableRow>
  );
};

export { UserPositionRow };
