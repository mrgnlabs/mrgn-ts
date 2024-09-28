import React from "react";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { ExtendedBankInfo, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";

type ActionBoxContextType = {
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  connected: boolean;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  accountSummaryArg?: AccountSummary;
};

const ActionBoxContext = React.createContext<ActionBoxContextType | null>(null);

export const ActionBoxProvider: React.FC<ActionBoxContextType & { children: React.ReactNode }> = ({
  children,
  ...props
}) => {
  return <ActionBoxContext.Provider value={props}>{children}</ActionBoxContext.Provider>;
};

export const useActionBoxContext = () => {
  const context = React.useContext(ActionBoxContext);
  return context;
};
