import React from "react";

import { ActionType, ExtendedBankInfo, StakePoolMetadata } from "@mrgnlabs/mrgn-state";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { ActionInputTag } from "~/components/action-box-v2/components";
import { StakeAccountSwitcher } from "~/components/action-box-v2/actions/lend-box/components/stake-accounts";
import { PublicKey } from "@solana/web3.js";
import { useActionBoxContext } from "~/components/action-box-v2/contexts";

type LendingActionProps = {
  walletAmount: number | undefined;
  maxAmount: number;
  showLendingHeader?: boolean;
  lendMode: ActionType;
  selectedBank: ExtendedBankInfo | null;
  disabled?: boolean;
  selectedStakeAccount?: PublicKey;
  onStakeAccountChange: (stakeAccount: { address: PublicKey; balance: number }) => void;
  onSetAmountRaw: (amount: string) => void;
};

export const LendingAction = ({
  maxAmount,
  walletAmount,
  onSetAmountRaw,
  selectedBank,
  lendMode,
  disabled = false,
  selectedStakeAccount,
  onStakeAccountChange,
}: LendingActionProps) => {
  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);
  const contextProps = useActionBoxContext();
  const stakeAccounts = contextProps?.stakeAccounts;
  const stakePoolMetadataMap = contextProps?.stakePoolMetadataMap;
  const marginfiClient = contextProps?.marginfiClient;
  const selectedAccount = contextProps?.selectedAccount;

  const maxLabel = React.useMemo((): {
    amount: string;
    showWalletIcon?: boolean;
    label?: string | React.ReactNode;
  } => {
    if (!selectedBank) {
      return {
        amount: "-",
        showWalletIcon: false,
      };
    }

    const formatAmount = (amount?: number, symbol?: string) =>
      amount !== undefined ? `${dynamicNumeralFormatter(amount)} ${symbol}` : "-";

    switch (lendMode) {
      case ActionType.Deposit:
        if (selectedBank.info.rawBank.config.assetTag === 2) {
          return {
            label: (
              <StakeAccountSwitcher
                selectedBank={selectedBank}
                selectedStakeAccount={selectedStakeAccount}
                stakeAccounts={stakeAccounts ?? []}
                onStakeAccountChange={onStakeAccountChange}
                stakePoolMetadataMap={stakePoolMetadataMap ?? null}
                marginfiClient={marginfiClient ?? null}
                selectedAccount={selectedAccount ?? null}
                onRefresh={() => {
                  // Refresh stake account data after merge
                  // This will be handled by the parent component's refresh mechanism
                }}
              />
            ),
            amount: formatAmount(walletAmount, "SOL"),
          };
        }

        return {
          label: "Wallet: ",
          amount: formatAmount(walletAmount, selectedBank?.meta.tokenSymbol),
        };
      case ActionType.Borrow:
        return {
          label: "Max Borrow: ",
          amount: formatAmount(selectedBank.userInfo.maxBorrow, selectedBank?.meta.tokenSymbol),
        };

      case ActionType.Withdraw:
        return {
          amount: formatAmount(
            selectedBank?.isActive ? selectedBank.position.amount : undefined,
            selectedBank?.meta.tokenSymbol
          ),
          label: "Supplied: ",
        };

      case ActionType.Repay:
        return {
          amount: formatAmount(
            selectedBank?.isActive ? selectedBank.position.amount : undefined,
            selectedBank?.meta.tokenSymbol
          ),
          label: "Borrowed: ",
        };

      default:
        return { amount: "-" };
    }
  }, [
    selectedBank,
    lendMode,
    walletAmount,
    stakeAccounts,
    stakePoolMetadataMap,
    marginfiClient,
    selectedAccount,
    selectedStakeAccount,
    onStakeAccountChange,
  ]);

  return (
    <>
      {selectedBank && (
        <ActionInputTag
          label={maxLabel.label}
          amount={maxLabel.amount}
          isDisabled={maxAmount === 0 || disabled}
          handleOnClick={() => onSetAmountRaw(numberFormater.format(maxAmount))}
        />
      )}
    </>
  );
};
