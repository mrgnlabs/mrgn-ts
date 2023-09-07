import { MarginfiAccountWrapper, MarginfiClient, MarginfiConfig } from "@mrgnlabs/marginfi-client-v2";
import {
  ExtendedBankInfo,
  Emissions,
  FEE_MARGIN,
  ActionType,
  getCurrentAction,
  ExtendedBankMetadata,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { toast } from "react-toastify";
import { isWholePosition } from "./mrgnUtils";

const CLOSE_BALANCE_TOAST_ID = "close-balance";
const BORROW_OR_LEND_TOAST_ID = "borrow-or-lend";

export const closeBalance = async ({
  bank,
  marginfiAccount,
}: {
  bank: ExtendedBankInfo;
  marginfiAccount?: MarginfiAccountWrapper;
}) => {
  if (!marginfiAccount) {
    toast.error("marginfi account not ready.");
    throw new Error("marginfi account not ready.");
  }

  if (!bank.isActive) {
    toast.error("no position to close.");
    throw new Error("no position to close.");
  }

  toast.loading("Closing dust balance", {
    toastId: CLOSE_BALANCE_TOAST_ID,
  });

  try {
    if (bank.position.isLending) {
      await marginfiAccount.withdraw(0, bank.address, true);
    } else {
      await marginfiAccount.repay(0, bank.address, true);
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
};

export const borrowOrLend = async ({
  mfiClient,
  currentAction,
  bank,
  borrowOrLendAmount,
  nativeSolBalance,
  marginfiAccount,
}: {
  mfiClient: MarginfiClient;
  bank: ExtendedBankInfo;
  currentAction: ActionType | "Connect";
  borrowOrLendAmount: number;
  nativeSolBalance: number;
  marginfiAccount?: MarginfiAccountWrapper;
}) => {
  if (mfiClient === null) throw Error("Marginfi client not ready");

  if (currentAction === ActionType.Deposit && bank.info.state.totalDeposits >= bank.info.rawBank.config.depositLimit) {
    toast.error(
      `${bank.meta.tokenSymbol} deposit limit has been been reached. Additional deposits are not currently available.`
    );
    return;
  }

  if (currentAction === ActionType.Borrow && bank.info.state.totalBorrows >= bank.info.rawBank.config.borrowLimit) {
    toast.error(
      `${bank.meta.tokenSymbol} borrow limit has been been reached. Additional borrows are not currently available.`
    );
    return;
  }

  if (currentAction === ActionType.Deposit && bank.userInfo.maxDeposit === 0) {
    toast.error(`You don't have any ${bank.meta.tokenSymbol} to lend in your wallet.`);
    return;
  }

  if (currentAction === ActionType.Borrow && bank.userInfo.maxBorrow === 0) {
    toast.error(`You cannot borrow any ${bank.meta.tokenSymbol} right now.`);
    return;
  }

  if (borrowOrLendAmount <= 0) {
    toast.error("Please enter an amount over 0.");
    return;
  }

  let _marginfiAccount = marginfiAccount;

  if (nativeSolBalance < FEE_MARGIN) {
    toast.error("Not enough sol for fee.");
    return;
  }

  // -------- Create marginfi account if needed
  try {
    if (!_marginfiAccount) {
      if (currentAction !== ActionType.Deposit) {
        toast.error("An account is required for anything operation except deposit.");
        return;
      }

      toast.loading("Creating account", {
        toastId: BORROW_OR_LEND_TOAST_ID,
      });

      _marginfiAccount = await mfiClient.createMarginfiAccount();
      toast.update(BORROW_OR_LEND_TOAST_ID, {
        render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bank.meta.tokenSymbol}`,
      });
    }
  } catch (error: any) {
    toast.update(BORROW_OR_LEND_TOAST_ID, {
      render: `Error while ${currentAction + "ing"}: ${error.message}`,
      type: toast.TYPE.ERROR,
      autoClose: 5000,
      isLoading: false,
    });
    console.log(`Error while ${currentAction + "ing"}`);
    console.log(error);
    return;
  }

  // -------- Perform relevant operation
  try {
    if (currentAction === ActionType.Deposit) {
      await _marginfiAccount.deposit(borrowOrLendAmount, bank.address);

      toast.update(BORROW_OR_LEND_TOAST_ID, {
        render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bank.meta.tokenSymbol} 👍`,
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    }

    toast.loading(`${currentAction + "ing"} ${borrowOrLendAmount} ${bank.meta.tokenSymbol}`, {
      toastId: BORROW_OR_LEND_TOAST_ID,
    });
    if (_marginfiAccount === null) {
      // noinspection ExceptionCaughtLocallyJS
      throw Error("Marginfi account not ready");
    }

    if (currentAction === ActionType.Borrow) {
      await _marginfiAccount.borrow(borrowOrLendAmount, bank.address);
    } else if (currentAction === ActionType.Repay) {
      await _marginfiAccount.repay(
        borrowOrLendAmount,
        bank.address,
        bank.isActive && isWholePosition(bank, borrowOrLendAmount)
      );
    } else if (currentAction === ActionType.Withdraw) {
      await _marginfiAccount.withdraw(
        borrowOrLendAmount,
        bank.address,
        bank.isActive && isWholePosition(bank, borrowOrLendAmount)
      );
    }

    toast.update(BORROW_OR_LEND_TOAST_ID, {
      render: `${currentAction + "ing"} ${borrowOrLendAmount} ${bank.meta.tokenSymbol} 👍`,
      type: toast.TYPE.SUCCESS,
      autoClose: 2000,
      isLoading: false,
    });
  } catch (error: any) {
    toast.update(BORROW_OR_LEND_TOAST_ID, {
      render: `Error while ${currentAction + "ing"}: ${error.message}`,
      type: toast.TYPE.ERROR,
      autoClose: 5000,
      isLoading: false,
    });
    console.log(`Error while ${currentAction + "ing"}`);
    console.log(error);
  }
};
