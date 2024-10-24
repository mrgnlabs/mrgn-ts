import React from "react";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { ExtendedBankInfo, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { useActionBoxStore } from "../../store";
import { ActionComplete } from "~/components/action-complete";

export type HidePoolState = Array<"amount" | "health" | "size" | "type" | "oracle" | "liquidation">;

type ActionBoxContextType = {
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  connected: boolean;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  showActionComplete?: boolean;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  accountSummaryArg?: AccountSummary;
  hidePoolStats?: HidePoolState;
};

const ActionBoxContext = React.createContext<ActionBoxContextType | null>(null);

export const ActionBoxProvider: React.FC<ActionBoxContextType & { children: React.ReactNode }> = ({
  children,
  showActionComplete = true,
  ...props
}) => {
  const [isActionComplete, previousTxn, setIsActionComplete, setPreviousTxn] = useActionBoxStore((state) => [
    state.isActionComplete,
    state.previousTxn,
    state.setIsActionComplete,
    state.setPreviousTxn,
  ]);

  return (
    <ActionBoxContext.Provider value={props}>
      {children}
      {previousTxn && isActionComplete && showActionComplete && (
        <ActionComplete
          isActionComplete={isActionComplete}
          setIsActionComplete={setIsActionComplete}
          previousTxn={previousTxn}
        />
      )}
    </ActionBoxContext.Provider>
  );
};

export const useActionBoxContext = () => {
  const context = React.useContext(ActionBoxContext);
  return context;
};
