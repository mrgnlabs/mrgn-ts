import React, { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import tw from "~/styles/tailwind";
import { NumberInput, PrimaryButton, SecondaryButton } from "~/components/Common";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

type Props = {
  currentAction: ActionType;
  bankInfo: ExtendedBankInfo;
  isBankFilled: boolean;
  onAction: (amount: string) => void;
};

export function PoolCardActions({ currentAction, bankInfo, isBankFilled, onAction }: Props) {
  const [amount, setAmount] = useState<string>("0");

  const maxAmount = useMemo(() => {
    switch (currentAction) {
      case ActionType.Deposit:
        return bankInfo.maxDeposit;
      case ActionType.Withdraw:
        return bankInfo.maxWithdraw;
      case ActionType.Borrow:
        return bankInfo.maxBorrow;
      case ActionType.Repay:
        return bankInfo.maxRepay;
    }
  }, [bankInfo.maxBorrow, bankInfo.maxDeposit, bankInfo.maxRepay, bankInfo.maxWithdraw, currentAction]);

  const isDisabled = useMemo(() => {
    switch (currentAction) {
      case ActionType.Deposit:
        return isBankFilled;
      case ActionType.Withdraw:
        return false;
      case ActionType.Borrow:
        return isBankFilled;
      case ActionType.Repay:
        return false;
    }
  }, [currentAction, isBankFilled]);

  const buttonText = useMemo(() => {
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
  }, [currentAction, isDisabled]);

  return (
    <>
      {!isDisabled ? (
        <View style={tw`flex flex-row gap-8px w-full relative`}>
          <View style={tw`flex-auto`}>
            <NumberInput
              min={0}
              max={maxAmount}
              amount={amount}
              decimals={bankInfo.tokenMintDecimals}
              onValueChange={(value) => setAmount(value)}
            />
            <View style={tw`absolute top-0 right-12px bottom-0 my-auto h-20px`}>
              <Pressable onPress={() => setAmount(maxAmount.toString())}>
                <Text style={tw`text-primary text-sm`}>Max</Text>
              </Pressable>
            </View>
          </View>
          {currentAction == ActionType.Withdraw || currentAction == ActionType.Repay ? (
            <SecondaryButton title={buttonText} onPress={() => onAction(amount)} />
          ) : (
            <PrimaryButton title={buttonText} onPress={() => onAction(amount)} />
          )}
        </View>
      ) : (
        <PrimaryButton isDisabled title={buttonText} onPress={() => {}} />
      )}
    </>
  );
}
