import React from "react";

import { MaxCapType, TransactionBroadcastType, TransactionPriorityType } from "@mrgnlabs/mrgn-common";
import { DEFAULT_PRIORITY_SETTINGS } from "@mrgnlabs/mrgn-utils";

type ActionContextType = {
  priorityType: TransactionPriorityType;
  broadcastType: TransactionBroadcastType;
  maxCap: number;
  maxCapType: MaxCapType;
};

const ActionContext = React.createContext<ActionContextType>({ ...DEFAULT_PRIORITY_SETTINGS });

export const ActionProvider: React.FC<ActionContextType & { children: React.ReactNode }> = ({ children, ...props }) => {
  return <ActionContext.Provider value={props}>{children}</ActionContext.Provider>;
};

export const useActionContext = () => {
  const context = React.useContext(ActionContext);
  return context;
};
