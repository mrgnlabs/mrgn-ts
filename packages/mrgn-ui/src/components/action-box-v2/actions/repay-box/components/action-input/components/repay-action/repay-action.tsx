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
  const calculateAmountLeft = React.useMemo(() => {
    if (!selectedBank?.isActive) return "0";
    if (!repayAmount) return dynamicNumeralFormatter(selectedBank.position.amount);

    const repayAmountInSelectedBank =
      selectedBank.position.amount -
      repayAmount *
        ((selectedSecondaryBank?.info.oraclePrice.priceRealtime.price.toNumber() ??
          selectedBank.info.oraclePrice.priceRealtime.price.toNumber()) /
          selectedBank.info.oraclePrice.priceRealtime.price.toNumber());

    return repayAmountInSelectedBank < 0 ? "0" : dynamicNumeralFormatter(repayAmountInSelectedBank);
  }, [selectedBank, selectedSecondaryBank, repayAmount]);

  const maxLabel = React.useMemo(() => {
    const amountLeft = `${calculateAmountLeft} ${selectedBank?.meta.tokenSymbol}`;
    return {
      amount: amountLeft,
      label: "Borrowed: ",
    };
  }, [calculateAmountLeft, selectedBank]);

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
    <li className="flex justify-between items-center gap-1.5">
      <strong className="mr-auto">{maxLabel.label}</strong>
      <div className="flex space-x-1 items-center">
        {selectedBank?.isActive && !isUnchanged && (
          <div>
            {dynamicNumeralFormatter(selectedBank.position.amount, {
              tokenPrice: selectedBank.info.oraclePrice.priceRealtime.price.toNumber(),
              ignoreMinDisplay: true,
            })}
          </div>
        )}
        {selectedBank?.isActive && !isUnchanged && <IconArrowRight width={12} height={12} />}
        <div>{maxLabel.amount}</div>
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
    if (
      !selectedSecondaryBank ||
      !selectedBank ||
      selectedBank.address.toBase58() === selectedSecondaryBank.address.toBase58()
    ) {
      return null;
    }

    const depositedAmount = selectedSecondaryBank.isActive ? selectedSecondaryBank.position.amount : 0;
    const afterAmount = depositedAmount - Number(amountRaw);

    return (
      <li className="flex justify-between items-center gap-1.5">
        <strong>Deposited:</strong>
        <div className="flex space-x-1.5 items-center">
          {selectedSecondaryBank.isActive
            ? dynamicNumeralFormatter(depositedAmount, {
                tokenPrice: selectedSecondaryBank.info.oraclePrice.priceRealtime.price.toNumber(),
              })
            : 0}
          {selectedSecondaryBank.isActive && !isUnchanged && <IconArrowRight width={12} height={12} />}
          {selectedSecondaryBank.isActive &&
            !isUnchanged &&
            dynamicNumeralFormatter(afterAmount, {
              tokenPrice: selectedSecondaryBank.info.oraclePrice.priceRealtime.price.toNumber(),
            })}
          {selectedSecondaryBank.meta.tokenSymbol}
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
