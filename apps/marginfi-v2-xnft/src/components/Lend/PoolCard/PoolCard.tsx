import React, { useCallback, useMemo } from "react";
import { StyleSheet, View, Text, Image } from "react-native";

import { ActionType, Emissions, ExtendedBankInfo, FEE_MARGIN, getCurrentAction } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { showErrorToast, showSuccessToast } from "~/utils";
import tw from "~/styles/tailwind";
import { useConnection } from "~/context/ConnectionContext";

import { PoolCardStats } from "./PoolCardStats";
import { PoolCardActions } from "./PoolCardActions";
import { PoolCardPosition } from "./PoolCardPosition";

type Props = {
  bankInfo: ExtendedBankInfo;
  nativeSolBalance: number;
  isInLendingMode: boolean;
  marginfiClient: MarginfiClient | null;
  marginfiAccount: MarginfiAccountWrapper | null;
  reloadBanks: () => Promise<void>;
};

export function PoolCard({
  bankInfo,
  isInLendingMode,
  nativeSolBalance,
  marginfiAccount,
  marginfiClient,
  reloadBanks,
}: Props) {
  const rateAP = useMemo(
    () =>
      percentFormatter.format(
        (isInLendingMode ? bankInfo.info.state.lendingRate : bankInfo.info.state.borrowingRate) +
          (isInLendingMode && bankInfo.info.state.emissions == Emissions.Lending
            ? bankInfo.info.state.emissionsRate
            : 0) +
          (!isInLendingMode && bankInfo.info.state.emissions == Emissions.Borrowing
            ? bankInfo.info.state.emissionsRate
            : 0)
      ),
    [isInLendingMode, bankInfo]
  );

  const currentAction = useMemo(() => getCurrentAction(isInLendingMode, bankInfo), [isInLendingMode, bankInfo]);

  const depositFilled = useMemo(
    () => bankInfo.info.state.totalDeposits / bankInfo.info.rawBank.config.depositLimit.toNumber(),
    [bankInfo]
  );
  const borrowFilled = useMemo(
    () => bankInfo.info.state.totalBorrows / bankInfo.info.rawBank.config.borrowLimit.toNumber(),
    [bankInfo]
  );

  const { connection } = useConnection();

  const borrowOrLend = useCallback(
    async (amount: string) => {
      const borrowOrLendAmount = Number.parseFloat(amount);

      if (Number.isNaN(borrowOrLendAmount) || borrowOrLendAmount <= 0) {
        return;
      }

      if (!connection) throw Error("No connection found");

      if (marginfiClient === null) throw Error("Marginfi client not ready");

      if (currentAction === ActionType.Deposit && bankInfo.userInfo.maxDeposit === 0) {
        showErrorToast(`You don't have any ${bankInfo.meta.tokenSymbol} to lend in your wallet.`);
        return;
      }

      if (currentAction === ActionType.Borrow && bankInfo.userInfo.maxBorrow === 0) {
        showErrorToast(`You cannot borrow any ${bankInfo.meta.tokenSymbol} right now.`);
        return;
      }

      let _marginfiAccount = marginfiAccount;

      if (nativeSolBalance < FEE_MARGIN) {
        showErrorToast("Not enough sol for fee.");
        return;
      }

      // -------- Create marginfi account if needed
      try {
        if (_marginfiAccount === null || !_marginfiAccount) {
          if (currentAction !== ActionType.Deposit) {
            showErrorToast("An account is required for anything operation except deposit.");
            return;
          }
          // Creating account
          _marginfiAccount = await marginfiClient.createMarginfiAccount();
        }
      } catch (error: any) {
        const lamportError = String(error).includes("0x1");
        if (lamportError) {
          showErrorToast("Not enough SOL");
        }
        console.log(`Error while ${currentAction + "ing"}`);
        console.log(error);
        return;
      }

      // -------- Perform relevant operation
      try {
        let signature = "";
        if (currentAction === ActionType.Deposit) {
          signature = await _marginfiAccount.deposit(borrowOrLendAmount, bankInfo.address);
        }

        if (_marginfiAccount === null || !_marginfiAccount) {
          // noinspection ExceptionCaughtLocallyJS
          throw Error("Marginfi account not ready");
        }

        if (currentAction === ActionType.Borrow) {
          signature = await _marginfiAccount.borrow(borrowOrLendAmount, bankInfo.address);
        } else if (currentAction === ActionType.Repay) {
          const repayAll = bankInfo.isActive ? borrowOrLendAmount === bankInfo.position.amount : false;
          signature = await _marginfiAccount.repay(borrowOrLendAmount, bankInfo.address, repayAll);
        } else if (currentAction === ActionType.Withdraw) {
          const withdrawAll = bankInfo.isActive ? borrowOrLendAmount === bankInfo.position.amount : false;
          signature = await _marginfiAccount.withdraw(borrowOrLendAmount, bankInfo.address, withdrawAll);
        }
        showSuccessToast(`${currentAction + "ing"} ${borrowOrLendAmount} ${bankInfo.meta.tokenSymbol} 👍`);
        const aha = await connection.confirmTransaction(signature, "confirmed");
      } catch (error: any) {
        console.log(`Error while ${currentAction + "ing"}`);
        console.log(error);
      } finally {
        try {
          await reloadBanks();
        } catch (error: any) {
          console.log("Error while reloading state");
          console.log(error);
        }
      }
    },
    [bankInfo, connection, currentAction, marginfiAccount, marginfiClient, nativeSolBalance, reloadBanks]
  );

  const closeBalance = useCallback(async () => {
    if (!marginfiAccount) {
      showErrorToast("Marginfi account not ready.");
      return;
    }

    if (!bankInfo.isActive) {
      showErrorToast("No position to close.");
      return;
    }

    try {
      if (bankInfo.position.isLending) {
        await marginfiAccount.withdraw(0, bankInfo.address, true);
      } else {
        await marginfiAccount.repay(0, bankInfo.address, true);
      }
      showSuccessToast("Closing 👍");
    } catch (error: any) {
      showSuccessToast(`Error while closing balance: ${error.message}`);
      console.log(`Error while closing balance`);
      console.log(error);
    }

    // TODO: set values back to 0
    try {
      await reloadBanks();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [bankInfo, marginfiAccount, reloadBanks]);

  return (
    <View style={[tw`bg-[#1C2125] rounded-xl px-12px py-16px flex flex-col gap-[16px] max-w-sm min-w-[300px] flex-1`]}>
      <View style={tw`flex flex-row justify-between`}>
        <View style={tw`flex flex-row gap-7px`}>
          <Image style={styles.logo} source={{ uri: bankInfo.meta.tokenLogoUri }} alt={bankInfo.meta.tokenSymbol} />
          <View style={tw`flex flex-col`}>
            <Text style={tw`text-primary text-base`}>{bankInfo.meta.tokenSymbol}</Text>
            <Text style={tw`text-tertiary`}>{usdFormatter.format(bankInfo.info.state.price)}</Text>
          </View>
        </View>
        <View>
          <Text style={tw`text-${isInLendingMode ? "success" : "error"} text-base my-auto`}>
            {rateAP.concat(...[" ", isInLendingMode ? "APY" : "APR"])}
          </Text>
        </View>
      </View>
      <PoolCardStats
        bank={bankInfo}
        bankFilledPercentage={isInLendingMode ? depositFilled : borrowFilled}
        nativeSolBalance={nativeSolBalance}
        isInLendingMode={isInLendingMode}
      />
      {bankInfo.isActive && <PoolCardPosition activeBank={bankInfo} />}
      <PoolCardActions
        currentAction={currentAction}
        isBankFilled={isInLendingMode ? depositFilled >= 0.9999 : borrowFilled >= 0.9999}
        bank={bankInfo}
        onAction={(amount) => (amount ? borrowOrLend(amount) : closeBalance())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 40,
    height: 40,
  },
});
