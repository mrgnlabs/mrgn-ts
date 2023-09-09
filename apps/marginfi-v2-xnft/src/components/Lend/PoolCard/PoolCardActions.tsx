import React, { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import tw from "~/styles/tailwind";
import { NumberInput, PrimaryButton, SecondaryButton } from "~/components/Common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { uiToNative } from "@mrgnlabs/mrgn-common";

type Props = {
  currentAction: ActionType;
  bank: ExtendedBankInfo;
  isBankFilled: boolean;
  onAction: (amount?: string) => void;
};

export function PoolCardActions({ currentAction, bank, isBankFilled, onAction }: Props) {
  const [amount, setAmount] = useState<string>("0");

  const maxAmount = useMemo(() => {
    switch (currentAction) {
      case ActionType.Deposit:
        return bank.userInfo.maxDeposit;
      case ActionType.Withdraw:
        return bank.userInfo.maxWithdraw;
      case ActionType.Borrow:
        return bank.userInfo.maxBorrow;
      case ActionType.Repay:
        return bank.userInfo.maxRepay;
    }
  }, [bank.userInfo, currentAction]);

  const isDust = useMemo(
    () => bank.isActive && uiToNative(bank.position.amount, bank.info.state.mintDecimals).isZero(),
    [bank]
  );

  const isDisabled = useMemo(
    () =>
      (isDust && uiToNative(bank.userInfo.tokenAccount.balance, bank.info.state.mintDecimals).isZero()) ||
      maxAmount === 0,
    [currentAction, bank, isDust, maxAmount]
  );

  const buttonText = useMemo(() => {
    if (isDust) return "Close";
    switch (currentAction) {
      case ActionType.Deposit:
        return isDisabled ? "Deposits reached the limit" : "Supply";
      case ActionType.Withdraw:
        return "Withdraw";
      case ActionType.Borrow:
        return isDisabled ? "Borrows reached the limit" : "Borrow";
      case ActionType.Repay:
        return "Repay";
    }
  }, [currentAction, isDisabled, isDust]);

  return (
    <>
      {!isDisabled ? (
        <View style={tw`flex flex-row gap-8px w-full relative`}>
          <View style={tw`flex-auto`}>
            <NumberInput
              min={0}
              max={maxAmount}
              amount={amount}
              decimals={bank.info.state.mintDecimals}
              onValueChange={(value) => setAmount(value)}
            />
            <View style={tw`absolute top-0 right-12px bottom-0 my-auto h-20px`}>
              <Pressable onPress={() => setAmount(maxAmount.toString())}>
                <Text style={tw`text-primary text-sm`}>Max</Text>
              </Pressable>
            </View>
          </View>
          {currentAction == ActionType.Withdraw || currentAction == ActionType.Repay ? (
            <SecondaryButton title={buttonText ?? ""} onPress={() => (isDust ? onAction() : onAction(amount))} />
          ) : (
            <PrimaryButton title={buttonText ?? ""} onPress={() => onAction(amount)} />
          )}
        </View>
      ) : (
        <PrimaryButton isDisabled title={buttonText ?? ""} onPress={() => {}} />
      )}
    </>
  );
}
