import React from "react";

import { TransactionBroadcastType } from "@mrgnlabs/mrgn-utils";

type ActionContextType = {
  broadcastType: TransactionBroadcastType;
  priorityFee: number;
};

const ActionContext = React.createContext<ActionContextType | null>(null);

export const ActionProvider: React.FC<ActionContextType & { children: React.ReactNode }> = ({ children, ...props }) => {
  return <ActionContext.Provider value={props}>{children}</ActionContext.Provider>;
};

export const useActionContext = () => {
  const context = React.useContext(ActionContext);
  return context;
};
