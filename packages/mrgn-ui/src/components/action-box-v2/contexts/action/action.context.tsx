import React from "react";

import { TransactionSettings } from "@mrgnlabs/mrgn-common";
import { PriorityFees } from "@mrgnlabs/marginfi-client-v2";
import { JupiterOptions } from "~/components/settings/settings";

type ActionContextType = {
  priorityFees: PriorityFees;
  jupiterOptions: JupiterOptions;
  transactionSettings: TransactionSettings;
};

const ActionContext = React.createContext<ActionContextType | null>(null);

export const ActionProvider: React.FC<ActionContextType & { children: React.ReactNode }> = ({ children, ...props }) => {
  return <ActionContext.Provider value={props}>{children}</ActionContext.Provider>;
};

export const useActionContext = () => {
  const context = React.useContext(ActionContext);

  if (!context) {
    console.warn("useActionContext called outside provider or with null context");
  }
  return context;
};
