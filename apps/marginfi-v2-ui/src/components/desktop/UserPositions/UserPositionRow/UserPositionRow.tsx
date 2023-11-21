import Image from "next/image";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { TableCell, TableRow } from "@mui/material";
import { FC, Fragment, useCallback, useState } from "react";
import { MrgnTooltip } from "~/components/common/MrgnTooltip";
import { UserPositionRowAction } from "./UserPositionRowAction";
import { UserPositionRowInputBox } from "./UserPositionRowInputBox";
import { groupedNumberFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { closeBalance, repay, withdraw } from "~/utils";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { showErrorToast } from "~/utils/toastUtils";

interface UserPositionRowProps {
  activeBankInfo: ActiveBankInfo;
  marginfiAccount?: MarginfiAccountWrapper | null;
  reloadPositions: () => Promise<void>;
}

const UserPositionRow: FC<UserPositionRowProps> = ({ activeBankInfo, marginfiAccount, reloadPositions }) => {
  const [withdrawOrRepayAmount, setWithdrawOrRepayAmount] = useState(0);

  const maxAmount = activeBankInfo.position.isLending
    ? activeBankInfo.userInfo.maxWithdraw
    : activeBankInfo.userInfo.maxRepay;
  const isDust = activeBankInfo.position.isDust;
  const showCloseBalance = activeBankInfo.position.isLending && isDust;
  const isActionDisabled = maxAmount === 0 && !showCloseBalance;

  const closeBalanceCb = useCallback(async () => {
    closeBalance({ marginfiAccount, bank: activeBankInfo });

    setWithdrawOrRepayAmount(0);

    try {
      await reloadPositions();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [activeBankInfo, marginfiAccount, reloadPositions]);

  const withdrawOrRepay = useCallback(async () => {
    if (!marginfiAccount) {
      showErrorToast("marginfi account not ready.");
      return;
    }
    if (withdrawOrRepayAmount <= 0) {
      showErrorToast("Please enter an amount over 0.");
      return;
    }

    await (activeBankInfo.position.isLending ? withdraw : repay)({
      marginfiAccount,
      bank: activeBankInfo,
      amount: withdrawOrRepayAmount,
    });

    setWithdrawOrRepayAmount(0);

    try {
      await reloadPositions();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [activeBankInfo, marginfiAccount, reloadPositions, withdrawOrRepayAmount]);

  return (
    <TableRow className="h-full w-full bg-[#171C1F] border border-[#1E2122] rounded-2xl">
      <TableCell className={`text-white p-0 font-aeonik border-[1px] border-none`}>
        <div className="flex justify-center items-center px-4 gap-2">
          {activeBankInfo.meta.tokenLogoUri && (
            <Image
              src={activeBankInfo.meta.tokenLogoUri}
              alt={activeBankInfo.meta.tokenSymbol}
              height={25}
              width={25}
            />
          )}
          <div className="font-aeonik">{activeBankInfo.meta.tokenSymbol}</div>
        </div>
      </TableCell>

      <TableCell
        className="text-white border-none px-2 font-aeonik hidden sm:table-cell"
        align="right"
        style={{ fontWeight: 300 }}
      >
        {activeBankInfo.position.amount < 0.01 && (
          <>
            <div className="flex items-center gap-1 justify-end">
              &lt; {groupedNumberFormatter.format(activeBankInfo.position.amount)}
              <MrgnTooltip title={<Fragment>{activeBankInfo.position.amount}</Fragment>} placement="top">
                <Image src="/info_icon.png" alt="info" height={16} width={16} />
              </MrgnTooltip>
            </div>
          </>
        )}
        {activeBankInfo.position.amount > 0.01 && groupedNumberFormatter.format(activeBankInfo.position.amount)}
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
          maxValue={maxAmount}
          maxDecimals={activeBankInfo.info.state.mintDecimals}
          disabled={showCloseBalance || isActionDisabled}
          onEnter={withdrawOrRepay}
        />
      </TableCell>

      <TableCell className="text-white font-aeonik p-0 border-none" align="right">
        <div className="h-full w-full flex justify-end items-center pl-2 sm:px-2">
          <UserPositionRowAction
            onClick={showCloseBalance ? closeBalanceCb : withdrawOrRepay}
            disabled={isActionDisabled}
          >
            {showCloseBalance ? "Close" : activeBankInfo.position.isLending ? "Withdraw" : "Repay"}
          </UserPositionRowAction>
        </div>
      </TableCell>
    </TableRow>
  );
};

export { UserPositionRow };
