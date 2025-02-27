import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { formatAmount, LendSelectionGroups, useIsMobile } from "@mrgnlabs/mrgn-utils";
import { tokenPriceFormatter, WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { Input } from "~/components/ui/input";
import { LendingAction, BankSelect } from "./components";

type ActionInputProps = {
  amountRaw: string;
  amount: number | null;
  nativeSolBalance: number;
  walletAmount: number | undefined;
  maxAmount: number;
  banks: ExtendedBankInfo[];
  selectedBank: ExtendedBankInfo | null;
  lendMode: ActionType;
  connected: boolean;
  showCloseBalance?: boolean;
  isDialog?: boolean;
  showTokenSelection?: boolean;
  selectionGroups?: LendSelectionGroups[];
  isMini?: boolean;

  searchMode?: boolean;
  onCloseDialog?: () => void;

  setAmountRaw: (amount: string) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
};

export const ActionInput = ({
  banks,
  nativeSolBalance,
  walletAmount,
  maxAmount,
  showCloseBalance,
  connected,
  isDialog,
  showTokenSelection,
  selectionGroups,
  amountRaw,
  amount,
  selectedBank,
  lendMode,
  searchMode,
  onCloseDialog,
  setAmountRaw,
  setSelectedBank,
}: ActionInputProps) => {
  const amountInputRef = React.useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const isInputDisabled = React.useMemo(() => maxAmount === 0 && !showCloseBalance, [maxAmount, showCloseBalance]);

  const formatAmountCb = React.useCallback(
    (newAmount: string, bank: ExtendedBankInfo | null) => {
      return formatAmount(newAmount, maxAmount, bank, numberFormater);
    },
    [maxAmount, numberFormater]
  );

  const handleInputChange = React.useCallback(
    (newAmount: string) => {
      setAmountRaw(formatAmountCb(newAmount, selectedBank));
    },
    [formatAmountCb, setAmountRaw, selectedBank]
  );

  const isTokenSelectionAvailable = React.useMemo(() => {
    if (showTokenSelection === undefined) return !isDialog;
    else return showTokenSelection;
  }, [showTokenSelection, isDialog]);

  const isDepositingStakedCollat = React.useMemo(() => {
    return selectedBank?.info.rawBank.config.assetTag === 2 && lendMode === ActionType.Deposit;
  }, [selectedBank, lendMode]);

  const tokenPrice = React.useMemo(() => {
    if (isDepositingStakedCollat) {
      const solBank = banks.find((bank) => bank.info.state.mint.equals(WSOL_MINT));
      return solBank?.info.oraclePrice.priceRealtime.price.toNumber() ?? 0;
    } else {
      return selectedBank?.info.oraclePrice.priceRealtime.price.toNumber() ?? 0;
    }
  }, [banks, selectedBank, isDepositingStakedCollat]);

  React.useEffect(() => {
    if (selectedBank && !isMobile) {
      amountInputRef.current?.focus();
    }
  }, [selectedBank, isMobile]);

  return (
    <div className="rounded-lg p-2.5 bg-mfi-action-box-background-dark">
      <div className="flex justify-center gap-1 items-center font-medium text-3xl">
        <div className="w-full flex-auto max-w-[162px]">
          <BankSelect
            selectedBank={selectedBank}
            setSelectedBank={(bank) => {
              setSelectedBank(bank);
            }}
            isSelectable={isTokenSelectionAvailable}
            selectionGroups={selectionGroups}
            banks={banks}
            nativeSolBalance={nativeSolBalance}
            lendMode={lendMode}
            connected={connected}
            isInitialOpen={searchMode}
            onCloseDialog={() => {
              selectedBank === null && onCloseDialog?.();
            }}
          />
        </div>
        <div className="flex-auto flex flex-col gap-0 items-end">
          <div className="flex gap-1 items-center">
            <Input
              type="text"
              ref={amountInputRef}
              inputMode="decimal"
              value={amountRaw}
              disabled={isInputDisabled}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="0"
              className="bg-transparent shadow-none min-w-[130px] text-right h-auto py-0 pr-0 outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
            />
          </div>
          {amount !== null && amount > 0 && selectedBank && (
            <span className="text-xs text-muted-foreground font-light">{tokenPriceFormatter(amount * tokenPrice)}</span>
          )}
        </div>
      </div>
      <LendingAction
        walletAmount={walletAmount}
        maxAmount={maxAmount}
        onSetAmountRaw={(amount) => handleInputChange(amount)}
        selectedBank={selectedBank}
        lendMode={lendMode}
      />
    </div>
  );
};
