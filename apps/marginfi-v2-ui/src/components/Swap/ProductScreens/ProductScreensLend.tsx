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

const DEPOSIT_OR_WITHDRAW_TOAST_ID = "deposit-or-withdraw";
const REFRESH_ACCOUNT_TOAST_ID = "refresh-account";
const ACCOUNT_DETECTION_ERROR_TOAST_ID = "account-detection-error";

// only retains banks the user has no position in, or has a lending position in
function filterLendingBanks(banks: ExtendedBankInfo[]) {
  return banks.filter((bank) => !bank.hasActivePosition || (bank.hasActivePosition && bank.position.isLending));
}

const ProductScreensLend: FC<{
  setProjectedDelta: (projectedHealthComponentDelta: { assets: number; liabilities: number }) => void;
}> = ({ setProjectedDelta }) => {
  const { extendedBankInfos, selectedAccount } = useUserAccounts();
  const { tokenAccountMap } = useTokenAccounts();
  const { mfiClient } = useProgram();
  const { reload: reloadBanks } = useBanks();

  const [selectedBank, setSelectedBank] = useState<ExtendedBankInfo>();
  const [whitelistedLendBanks, setWhitelistedLendBanks] = useState<ExtendedBankInfo[]>(
    filterLendingBanks(extendedBankInfos)
  );
  const [depositOrWithdrawAmount, setDepositOrWithdrawAmount] = useState<number>(0);
  const [isInDepositMode, setIsInDepositMode] = useState<boolean>(true);

  const depositOrWithdraw = useCallback(async () => {
    if (mfiClient === null || !selectedBank) return; // @todo: use spinner on associated button to prevent hitting that

    if (isInDepositMode && selectedBank.maxDeposit === 0) {
      toast.error(`You don't have any ${selectedBank.tokenName} to lend in your wallet.`);
      return;
    }

    if (depositOrWithdrawAmount <= 0) {
      toast.error("Please enter an amount over 0.");
      return;
    }

    let _marginfiAccount = selectedAccount;

    // -------- Create marginfi account if needed
    try {
      if (_marginfiAccount === null) {
        if (!isInDepositMode) {
          toast.error("A pre-existing account is required for any operation except deposit.");
          return;
        }

        toast.loading("Creating account", {
          toastId: DEPOSIT_OR_WITHDRAW_TOAST_ID,
        });

        const userAccounts = await mfiClient.getMarginfiAccountsForAuthority();
        if (userAccounts.length > 0) {
          toast.update(DEPOSIT_OR_WITHDRAW_TOAST_ID, {
            render: "Uh oh, data seems out-of-sync",
            toastId: DEPOSIT_OR_WITHDRAW_TOAST_ID,
            type: toast.TYPE.WARNING,
            autoClose: 3000,
            isLoading: false,
          });
          toast.loading("Refreshing data...", { toastId: ACCOUNT_DETECTION_ERROR_TOAST_ID });
          try {
            await reloadBanks();
            toast.update(ACCOUNT_DETECTION_ERROR_TOAST_ID, {
              render: "Refreshing data... Done. Please try again",
              type: toast.TYPE.SUCCESS,
              autoClose: 3000,
              isLoading: false,
            });
          } catch (error: any) {
            toast.update(ACCOUNT_DETECTION_ERROR_TOAST_ID, {
              render: `Error while reloading state: ${error.message ?? error}`,
              type: toast.TYPE.ERROR,
              autoClose: 5000,
              isLoading: false,
            });
            console.log("Error while reloading state");
            console.log(error);
          }
          return;
        }

        _marginfiAccount = await mfiClient.createMarginfiAccount();
        toast.update(DEPOSIT_OR_WITHDRAW_TOAST_ID, {
          render: `Depositing ${depositOrWithdrawAmount} ${selectedBank.tokenName}`,
        });
      }
    } catch (error: any) {
      toast.update(DEPOSIT_OR_WITHDRAW_TOAST_ID, {
        render: `Error while depositing: ${error.message ?? error}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(`Error while depositing`);
      console.log(error);
      return;
    }

    // -------- Perform relevant operation
    try {
      if (isInDepositMode) {
        await _marginfiAccount.deposit(depositOrWithdrawAmount, selectedBank.bank);

        toast.update(DEPOSIT_OR_WITHDRAW_TOAST_ID, {
          render: `${isInDepositMode ? "Depositing" : "Withdrawing"} ${depositOrWithdrawAmount} ${
            selectedBank.tokenName
          } 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      } // Withdraw
      else {
        toast.loading(`Withdrawing ${depositOrWithdrawAmount} ${selectedBank.tokenName}`, {
          toastId: DEPOSIT_OR_WITHDRAW_TOAST_ID,
        });
        const withdrawAll = isActiveBankInfo(selectedBank)
          ? depositOrWithdrawAmount === selectedBank.position.amount
          : false;
        await _marginfiAccount.withdraw(depositOrWithdrawAmount, selectedBank.bank, withdrawAll);

        toast.update(DEPOSIT_OR_WITHDRAW_TOAST_ID, {
          render: `Withdrawing ${depositOrWithdrawAmount} ${selectedBank.tokenName} 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      }
    } catch (error: any) {
      toast.update(DEPOSIT_OR_WITHDRAW_TOAST_ID, {
        render: `Error while ${isInDepositMode ? "depositing" : "withdrawing"}: ${error.message ?? error}`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        isLoading: false,
      });
      console.log(`Error while ${isInDepositMode ? "depositing" : "withdrawing"}`);
      console.log(error);
    }

    setDepositOrWithdrawAmount(0);

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
  }, [mfiClient, selectedBank, isInDepositMode, depositOrWithdrawAmount, selectedAccount, reloadBanks]);

  // Reset amount on mount
  useEffect(() => {
    setDepositOrWithdrawAmount(0);
  }, []);

  // Default selected bank from whitelisted banks
  useEffect(() => {
    if (whitelistedLendBanks.length === 0) return;

    if (!selectedBank) {
      setSelectedBank(whitelistedLendBanks[0]);
    } else {
      const updatedBank = whitelistedLendBanks.find((bank) => bank.bank.publicKey.equals(selectedBank.bank.publicKey));
      if (!!updatedBank) {
        setSelectedBank(updatedBank);
      }
    }
  }, [selectedBank, whitelistedLendBanks]);

  // Filters banks whenever they are updated
  useEffect(() => {
    setWhitelistedLendBanks(filterLendingBanks(extendedBankInfos));
  }, [extendedBankInfos]);

  // Update projected health delta on amount change
  useEffect(() => {
    if (!selectedBank) return;
    if (depositOrWithdrawAmount === 0) {
      setProjectedDelta({ assets: 0, liabilities: 0 });
      return;
    } else if (isInDepositMode) {
      setProjectedDelta({
        assets: selectedBank.bank
          .getUsdValue(
            new BigNumber(depositOrWithdrawAmount),
            PriceBias.Lowest,
            selectedBank.bank.getAssetWeight(MarginRequirementType.Maint),
            false
          )
          .toNumber(),
        liabilities: 0,
      });
    } else {
      setProjectedDelta({
        assets: -selectedBank.bank
          .getUsdValue(
            new BigNumber(depositOrWithdrawAmount),
            PriceBias.Highest,
            selectedBank.bank.getLiabilityWeight(MarginRequirementType.Maint),
            false
          )
          .toNumber(),
        liabilities: 0,
      });
    }
  }, [depositOrWithdrawAmount, selectedBank, isInDepositMode, setProjectedDelta]);

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
          <div className="block text-[#e1e1e1] text-sm">{isInDepositMode ? "Lend" : "Withdraw"}</div>
          <div className="block text-[#e1e1e1] text-sm">Balance: {groupedNumberFormatterDyn.format(tokenBalance)}</div>
        </div>
        <BankInputBox
          value={depositOrWithdrawAmount}
          setValue={setDepositOrWithdrawAmount}
          // maxValue
          // maxDecimals
          // disabled
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
              onClick={() => setIsInDepositMode((isInDepositMode) => !isInDepositMode)}
              checked={!isInDepositMode}
              style={{ color: "#e1e1e1" }}
            />
            Withdraw
          </>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex w-full justify-end">
          <div className="block text-[#e1e1e1] text-sm px-0.5">
            NET APY: {percentFormatterDyn.format(selectedBank.lendingRate)}
          </div>
        </div>
        <ActionButton onClick={depositOrWithdraw}>{isInDepositMode ? "Lend" : "Withdraw"}</ActionButton>
      </div>
    </div>
  );
};

export { ProductScreensLend };
