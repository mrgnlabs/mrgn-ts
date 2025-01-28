import React from "react";
import { IconArrowRight } from "@tabler/icons-react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

type RepayActionProps = {
  amountRaw: string;
  repayAmount: number;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  maxAmount: number;
  onSetAmountRaw: (amount: string) => void;
};

export const RepayAction = ({
  maxAmount,
  amountRaw,
  repayAmount,
  selectedBank,
  selectedSecondaryBank,
  onSetAmountRaw,
}: RepayActionProps) => {
  const isRepayCollat = React.useMemo(() => {
    return selectedBank?.address.toBase58() !== selectedSecondaryBank?.address.toBase58();
  }, [selectedBank, selectedSecondaryBank]);

  const calculateAmount = React.useMemo(() => {
    if (!selectedBank?.isActive) return "0";
    if (!repayAmount) return dynamicNumeralFormatter(selectedBank.position.amount);
    if (!isRepayCollat) {
      return dynamicNumeralFormatter(selectedBank.position.amount);
    }
    const repayAmountInSelectedBank = selectedBank.position.amount - repayAmount;

    return repayAmountInSelectedBank < 0 ? "0" : dynamicNumeralFormatter(repayAmountInSelectedBank);
  }, [selectedBank, repayAmount, isRepayCollat]);

  const maxLabel = React.useMemo(() => {
    const amountLeft = `${calculateAmount} ${selectedBank?.meta.tokenSymbol}`;
    return {
      amount: amountLeft,
      label: "Borrowed: ",
    };
  }, [calculateAmount, selectedBank]);

  const isUnchanged = amountRaw === "" || amountRaw === "0";

  const handleMaxClick = () => {
    if (selectedBank) {
      onSetAmountRaw(
        dynamicNumeralFormatter(maxAmount, {
          tokenPrice: selectedBank.info.oraclePrice.priceRealtime.price.toNumber(),
        })
      );
    }
  };

  const renderBorrowedSection = () => (
    <li className="flex justify-between items-center">
      <strong className="mr-auto">{maxLabel.label}</strong>
      <div className="flex space-x-1 items-center">
        {isRepayCollat && selectedBank?.isActive && !isUnchanged && (
          <span>
            {dynamicNumeralFormatter(selectedBank.position.amount, {
              tokenPrice: selectedBank.info.oraclePrice.priceRealtime.price.toNumber(),
              ignoreMinDisplay: true,
            })}
          </span>
        )}
        {isRepayCollat && selectedBank?.isActive && !isUnchanged && <IconArrowRight width={12} height={12} />}
        <span>{maxLabel.amount}</span>
        {selectedBank && (
          <button
            className="cursor-pointer border-b border-transparent transition text-mfi-action-box-highlight hover:border-mfi-action-box-highlight"
            onClick={handleMaxClick}
          >
            MAX
          </button>
        )}
      </div>
    </li>
  );

  const renderDepositedSection = () => {
    if (!selectedSecondaryBank || !selectedBank || !isRepayCollat) {
      return null;
    }

    const depositedAmount = selectedSecondaryBank.isActive ? selectedSecondaryBank.position.amount : 0;
    const afterAmount = depositedAmount - Number(amountRaw);

    return (
      <li className="flex justify-between items-center">
        <strong>Deposited:</strong>
        <div className="flex space-x-1 items-center">
          <span>{selectedSecondaryBank.isActive ? dynamicNumeralFormatter(depositedAmount) : 0}</span>
          {selectedSecondaryBank.isActive && !isUnchanged && <IconArrowRight width={12} height={12} />}
          <span>{selectedSecondaryBank.isActive && !isUnchanged && dynamicNumeralFormatter(afterAmount)}</span>
          <span>{selectedSecondaryBank.meta.tokenSymbol}</span>
        </div>
      </li>
    );
  };

  return (
    <>
      {selectedBank && (
        <ul className="flex flex-col gap-0.5 mt-4 text-xs w-full text-muted-foreground">
          {renderBorrowedSection()}
          {renderDepositedSection()}
        </ul>
      )}
    </>
  );
};
