import React from "react";
import { WalletContextState } from "@solana/wallet-adapter-react";

import {
  ExtendedBankInfo,
  AccountSummary,
  StakePoolMetadata,
  LstRatesMap,
  EmissionsRateData,
} from "@mrgnlabs/mrgn-state";
import { MarginfiAccountWrapper, MarginfiClient, ValidatorStakeGroup } from "@mrgnlabs/marginfi-client-v2";

import { WalletContextStateOverride } from "~/components/wallet-v2";

export type HidePoolStats = Array<"amount" | "health" | "size" | "type" | "oracle" | "liquidation">;

type ActionBoxContextType = {
  banks: ExtendedBankInfo[];
  lstRates?: LstRatesMap;
  emissionsRates?: EmissionsRateData;
  nativeSolBalance: number;
  connected: boolean;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  accountSummaryArg?: AccountSummary;
  hidePoolStats?: HidePoolStats;
  stakePoolMetadataMap?: Map<string, StakePoolMetadata>;
  stakeAccounts?: ValidatorStakeGroup[];
  setDisplaySettings?: (displaySettings: boolean) => void;
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
