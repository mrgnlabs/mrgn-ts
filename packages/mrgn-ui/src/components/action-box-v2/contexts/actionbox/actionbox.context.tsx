import React from "react";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { ExtendedBankInfo, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

import { WalletContextStateOverride } from "~/components/wallet-v2";
import { Connection } from "@solana/web3.js";
import { UserAssetBalance } from "@mrgnlabs/mrgn-common";
import { ComputerUserResponse } from "@mrgnlabs/mrgn-common";
import { ComputerInfoResponse } from "@mrgnlabs/mrgn-common";
import { SequencerTransactionRequest } from "@mixin.dev/mixin-node-sdk";

export type HidePoolStats = Array<"amount" | "health" | "size" | "type" | "oracle" | "liquidation">;

type ActionBoxContextType = {
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  connected: boolean;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  accountSummaryArg?: AccountSummary;
  hidePoolStats?: HidePoolStats;
  setDisplaySettings?: (displaySettings: boolean) => void;

  isMixinLend?: boolean;
  getUserMix?: () => string;
  computerInfo?: ComputerInfoResponse;
  connection?: Connection;
  computerAccount?: ComputerUserResponse;
  getComputerRecipient?: () => string;
  balanceAddressMap?: Record<string, UserAssetBalance>;
  fetchTransaction?: (transactionId: string) => Promise<SequencerTransactionRequest>;
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
