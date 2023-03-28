import { BankInputBox } from "~/components/Swap/BankInputBox";
import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useBanks, useProgram, useTokenAccounts, useUserAccounts } from "~/context";
import { ExtendedBankInfo, isActiveBankInfo } from "~/types";
import { ActionButton } from "~/components/Swap/ActionButton";
import { toast } from "react-toastify";
import { groupedNumberFormatterDyn, percentFormatterDyn, usdFormatter } from "~/utils/formatters";
import { MarginRequirementType, PriceBias } from "@mrgnlabs/marginfi-client-v2";
import BigNumber from "bignumber.js";
import { Checkbox } from "@mui/material";

const BORROW_OR_REPAY_TOAST_ID = "deposit-or-withdraw";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";

// only retains banks the user has no position in, or has a borrowing position in
function filterBorrowingBanks(banks: ExtendedBankInfo[]) {
  return banks.filter((bank) => !bank.hasActivePosition || (bank.hasActivePosition && !bank.position.isLending));
}

const ProductScreensBorrow: FC<{
  setProjectedDelta: (projectedHealthComponentDelta: { assets: number; liabilities: number }) => void;
}> = ({ setProjectedDelta }) => {
  const { extendedBankInfos, selectedAccount } = useUserAccounts();
  const { tokenAccountMap } = useTokenAccounts();
  const { mfiClient } = useProgram();
  const { reload: reloadBanks } = useBanks();

  const [selectedBank, setSelectedBank] = useState<ExtendedBankInfo>();
  const [whitelistedBorrowBanks, setWhitelistedBorrowBanks] = useState<ExtendedBankInfo[]>(
    filterBorrowingBanks(extendedBankInfos)
  );
  const [borrowOrRepayAmount, setBorrowOrRepayAmount] = useState<number>(0);
  const [isInBorrowMode, setIsInBorrowMode] = useState<boolean>(true);

  const maxAmount = useMemo(() => {
    if (!selectedBank) return undefined;
    if (isInBorrowMode) {
      return selectedBank.maxBorrow;
    } else {
      return selectedBank.maxRepay;
    }
  }, [selectedBank, isInBorrowMode]);

  const borrowOrRepay = useCallback(async () => {
    if (mfiClient === null || !selectedBank || !selectedAccount) return; // @todo: use spinner on associated button to prevent hitting that

    if (isInBorrowMode && selectedBank.maxBorrow === 0) {
      toast.error(`You don't have enough free collateral to borrow ${selectedBank.tokenName}.`);
      return;
    }

    if (borrowOrRepayAmount <= 0) {
      toast.error("Please enter an amount over 0.");
      return;
    }

    let marginfiAccount = selectedAccount;

    // -------- Perform relevant operation
    try {
      toast.loading(`${isInBorrowMode ? "Borrowing" : "Repaying"} ${borrowOrRepayAmount} ${selectedBank.tokenName}`, {
        toastId: BORROW_OR_REPAY_TOAST_ID,
      });

      if (isInBorrowMode) {
        await marginfiAccount.borrow(borrowOrRepayAmount, selectedBank.bank);

        toast.update(BORROW_OR_REPAY_TOAST_ID, {
          render: `Borrowing ${borrowOrRepayAmount} ${selectedBank.tokenName} 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      } // Withdraw
      else {
        const repayAll = isActiveBankInfo(selectedBank) ? borrowOrRepayAmount === selectedBank.position.amount : false;
        await marginfiAccount.repay(borrowOrRepayAmount, selectedBank.bank, repayAll);

        toast.update(BORROW_OR_REPAY_TOAST_ID, {
          render: `Repaying ${borrowOrRepayAmount} ${selectedBank.tokenName} 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      }
    } catch (error: any) {
      toast.update(BORROW_OR_REPAY_TOAST_ID, {
        render: `Error while ${isInBorrowMode ? "borrowing" : "repaying"}: ${error.message ?? error}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(`Error while ${isInBorrowMode ? "borrowing" : "repaying"}`);
      console.log(error);
    }

    setBorrowOrRepayAmount(0);

    // -------- Refresh state
    toast.loading("Refreshing state", { toastId: REFRESH_ACCOUNT_TOAST_ID });
    try {
      await reloadBanks();
      toast.update(REFRESH_ACCOUNT_TOAST_ID, {
        render: "Refreshing state 👍",
        type: toast.TYPE.SUCCESS,
        autoClose: 2000,
        isLoading: false,
      });
    } catch (error: any) {
      toast.update(REFRESH_ACCOUNT_TOAST_ID, {
        render: `Error while reloading state: ${error.message ?? error}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [mfiClient, selectedBank, isInBorrowMode, borrowOrRepayAmount, selectedAccount, reloadBanks]);

  // Reset amount on mount
  useEffect(() => {
    setBorrowOrRepayAmount(0);
  }, []);

  // Default selected bank from whitelisted banks
  useEffect(() => {
    if (whitelistedBorrowBanks.length === 0) return;

    if (!selectedBank) {
      setSelectedBank(whitelistedBorrowBanks[0]);
    } else {
      const updatedBank = whitelistedBorrowBanks.find((bank) =>
        bank.bank.publicKey.equals(selectedBank.bank.publicKey)
      );
      if (!!updatedBank) {
        setSelectedBank(updatedBank);
      }
    }
  }, [selectedBank, whitelistedBorrowBanks]);

  // Filters banks whenever they are updated
  useEffect(() => {
    setWhitelistedBorrowBanks(filterBorrowingBanks(extendedBankInfos));
  }, [extendedBankInfos]);

  // Update projected health delta on amount change
  useEffect(() => {
    if (!selectedBank) return;
    if (borrowOrRepayAmount === 0) {
      setProjectedDelta({ assets: 0, liabilities: 0 });
      return;
    } else if (isInBorrowMode) {
      setProjectedDelta({
        assets: 0,
        liabilities: selectedBank.bank
          .getUsdValue(
            new BigNumber(borrowOrRepayAmount),
            PriceBias.Highest,
            selectedBank.bank.getLiabilityWeight(MarginRequirementType.Maint),
            false
          )
          .toNumber(),
      });
    } else {
      setProjectedDelta({
        assets: 0,
        liabilities: -selectedBank.bank
          .getUsdValue(
            new BigNumber(borrowOrRepayAmount),
            PriceBias.Highest,
            selectedBank.bank.getLiabilityWeight(MarginRequirementType.Maint),
            false
          )
          .toNumber(),
      });
    }
  }, [borrowOrRepayAmount, selectedBank, isInBorrowMode, setProjectedDelta]);

  const tokenBalance = useMemo(() => {
    if (!selectedBank) return 0;
    const tokenAccount = tokenAccountMap.get(selectedBank.tokenMint.toString());
    if (tokenAccount) return tokenAccount.balance;
    return 0;
  }, [selectedBank, tokenAccountMap]);

  if (!selectedBank) return null;

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex w-full justify-between px-0.5 pb-2">
          <div className="block text-[#e1e1e1] text-sm">{isInBorrowMode ? "Borrow" : "Repay"}</div>
          <div className="block text-[#e1e1e1] text-sm">Balance: {groupedNumberFormatterDyn.format(tokenBalance)}</div>
        </div>
        <BankInputBox
          value={borrowOrRepayAmount}
          setValue={setBorrowOrRepayAmount}
          maxValue={maxAmount}
          selectedBank={selectedBank}
          setSelectedBank={setSelectedBank}
          banks={extendedBankInfos}
        />

        {selectedBank.hasActivePosition && (
          <>
            <div className="block text-[#e1e1e1] text-sm px-0.5 pt-2">
              <b>Current deposit</b>: {groupedNumberFormatterDyn.format(selectedBank.position.amount)} (
              {usdFormatter.format(selectedBank.position.usdValue)})
            </div>
            <Checkbox
              onClick={() => setIsInBorrowMode((isInDepositMode) => !isInDepositMode)}
              checked={!isInBorrowMode}
              style={{ color: "#e1e1e1" }}
            />
            Repay
          </>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex w-full justify-end">
          <div className="block text-[#e1e1e1] text-sm px-0.5">
            NET APY: {percentFormatterDyn.format(selectedBank.borrowingRate)}
          </div>
        </div>
        <ActionButton onClick={borrowOrRepay}>{isInBorrowMode ? "Borrow" : "Repay"}</ActionButton>
      </div>
    </div>
  );
};

export { ProductScreensBorrow };
