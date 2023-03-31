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

const SUPERSTAKE_OR_WITHDRAW_TOAST_ID = "superstake-or-withdraw";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";

const ProductScreensSuperstake: FC = () => {
  const { extendedBankInfos, selectedAccount } = useUserAccounts();
  const { tokenAccountMap } = useTokenAccounts();
  const { mfiClient } = useProgram();
  const { reload: reloadBanks } = useBanks();

  const [selectedBank, setSelectedBank] = useState<ExtendedBankInfo>();
  const [whitelistedBanks, setWhitelistedBanks] = useState<ExtendedBankInfo[] | []>([]);
  const [superStakeOrWithdrawAmount, setSuperStakeOrWithdrawAmount] = useState<number>(0);
  const [isInSuperStakeMode, setIsInSuperStakeMode] = useState<boolean>(true);

  // ================================
  // START: HELPERS
  // ================================

  /**
   * Filters the provided banks array to include only those with specific token names.
   *
   * @param {ExtendedBankInfo[]} banks - The array of banks to be filtered.
   * @returns {ExtendedBankInfo[]} - The filtered array of banks containing only the specified token names.
  */
  const filterBanks = (banks: ExtendedBankInfo[]) => {
    return banks.filter(
      (bank) => [
        "mSOL",
        "jitoSOL",
        "stSOL",
      ].includes(bank.tokenName)
    )
  }

  /**
   * Updates the selected bank when the whitelistedBanks array changes or a new bank is selected.
   * - If there are no whitelisted banks, do nothing.
   * - If there is no selected bank, set the first whitelisted bank as the selected bank.
   * - If there is a selected bank, update the selected bank with the latest info from the whitelisted banks.
  */
  useEffect(() => {
    if (whitelistedBanks.length === 0) return;

    if (!selectedBank) {
      setSelectedBank(whitelistedBanks[0]);
    } else {
      const updatedBank = whitelistedBanks.find((bank) =>
        bank.bank.publicKey.equals(selectedBank.bank.publicKey)
      );
      if (!!updatedBank) {
        setSelectedBank(updatedBank);
      }
    }
  }, [selectedBank, JSON.stringify(whitelistedBanks)]);

  /**
   * Updates the whitelistedBanks array when the extendedBankInfos array changes.
   * Applies the filterBanks function to the extendedBankInfos array to determine
   * which banks should be whitelisted.
  */
  useEffect(() => {
    setWhitelistedBanks(filterBanks(extendedBankInfos));
  }, [extendedBankInfos]);

  // Set the superStakeOrWithdrawAmount to 0 when the component mounts
  useEffect(() => {
    setSuperStakeOrWithdrawAmount(0);
  }, []);

  /**
   * Calculate the token balance for the selected bank using the tokenAccountMap.
   * If no selectedBank or tokenAccount is found, return 0 as the balance.
   */
  const tokenBalance = useMemo(() => {
    if (!selectedBank) return 0;
    const tokenAccount = tokenAccountMap.get(selectedBank.tokenMint.toString());
    if (tokenAccount) return tokenAccount.balance;
    return 0;
  }, [selectedBank, tokenAccountMap]);

  const maxAmount = useMemo(() => {
    if (!selectedBank) return undefined;
    if (isInSuperStakeMode) {
      // @todo NEEDS UPDATING
      return selectedBank.maxBorrow;
    } else {
      // @todo NEEDS UPDATING
      return selectedBank.maxRepay;
    }
  }, [selectedBank, isInSuperStakeMode]);

  // ================================
  // END: HELPERS
  // ================================

  const superStakeOrWithdraw = useCallback(async () => {
    // ================================
    // START: SETUP
    // ================================
    if (mfiClient === null || !selectedBank || !selectedAccount) return; // @todo: use spinner on associated button to prevent hitting that

    let marginfiAccount = selectedAccount;
    // ================================
    // END: SETUP
    // ================================

    // ================================
    // START: VALIDATION CHECKS
    // ================================

    // Don't think we need a free collateral check here

    if (superStakeOrWithdrawAmount <= 0) {
      toast.error("Please enter an amount over 0.");
      return;
    }
    
    // ================================
    // END: VALIDATION CHECKS
    // ================================

    // ================================
    // START: RELEVANT OPERATION
    // ================================

    try {

      toast.loading(`${isInSuperStakeMode ? "Staking" : "Withdrawing"} ${superStakeOrWithdrawAmount} ${selectedBank.tokenName}`, {
        toastId: SUPERSTAKE_OR_WITHDRAW_TOAST_ID,
      });

      if (isInSuperStakeMode) {
        await superStake(
          superStakeOrWithdrawAmount,
          selectedBank.bank
        );

        toast.update(SUPERSTAKE_OR_WITHDRAW_TOAST_ID, {
          render: `Staking ${superStakeOrWithdrawAmount} ${selectedBank.tokenName} 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      } // Withdraw
      else {
        // const repayAll = isActiveBankInfo(selectedBank) ? superStakeOrWithdrawAmount === selectedBank.position.amount : false;
        await withdrawSuperstake(
          superStakeOrWithdrawAmount,
          selectedBank.bank
        )

        toast.update(SUPERSTAKE_OR_WITHDRAW_TOAST_ID, {
          render: `Withdrawing ${superStakeOrWithdrawAmount} ${selectedBank.tokenName} 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      }

    } catch (error: any) {
      const msg = `Error while ${isInSuperStakeMode ? "staking" : "withdrawing"}: ${error.message ?? error}`

      toast.update(SUPERSTAKE_OR_WITHDRAW_TOAST_ID, {
        render: msg,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(msg);
    }
    // ================================
    // END: RELEVANT OPERATION
    // ================================

    // ================================
    // START: CLEAN UP
    // ================================

    // Clear the superStakeOrWithdrawAmount
    setSuperStakeOrWithdrawAmount(0);

    // ================================
    // END: CLEAN UP
    // ================================

    // ================================
    // START: REFRESH STATE
    // ================================

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
      const msg = `Error while reloading state: ${error.message ?? error}`
      toast.update(REFRESH_ACCOUNT_TOAST_ID, {
        render: msg,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(msg);
    }

    // ================================
    // END: REFRESH STATE
    // ================================

  }, [mfiClient, selectedBank, isInSuperStakeMode, superStakeOrWithdrawAmount, selectedAccount, reloadBanks]);

  if (!selectedBank) return null;

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex w-full justify-end px-0.5 pb-2">
          <div className="block text-[#e1e1e1] text-sm">Balance: {groupedNumberFormatterDyn.format(tokenBalance)}</div>
        </div>
        <BankInputBox
          value={superStakeOrWithdrawAmount}
          setValue={setSuperStakeOrWithdrawAmount}
          maxValue={maxAmount}
          selectedBank={selectedBank}
          setSelectedBank={setSelectedBank}
          banks={extendedBankInfos}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex w-full justify-between items-end">
          <div className="block text-[#9BEB8E] text-3xl px-0.5" style={{ fontWeight: 500 }}>
            23.5% APY
          </div>
        </div>
        <div className="w-full flex gap-2">
          <ActionButton onClick={borrowOrRepay}>⚡️ stake</ActionButton>
          <ActionButton onClick={borrowOrRepay}>🛑 withdraw</ActionButton>
        </div>
      </div>
    </div>
  );
};

export { ProductScreensSuperstake };
