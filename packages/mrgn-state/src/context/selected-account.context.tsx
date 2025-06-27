// SelectedAccountContext.tsx

import React, { createContext, useContext, ReactNode } from "react";
import { PublicKey } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { useMarginfiAccountAddresses, useSelectedAccountKey } from "../hooks";

interface SelectedAccountContextValue {
  selectedAccountKey: string | null;
  setSelectedAccountKey: (key: string) => void;
}

const SelectedAccountContext = createContext<SelectedAccountContextValue | undefined>(undefined);

export function SelectedAccountProvider({ children }: { children: ReactNode }) {
  // fetch the list of addresses once:
  const { data: accountAddresses } = useMarginfiAccountAddresses();

  // hand it off to your hook, which will:
  //  • on first mount read localStorage
  //  • once `accountAddresses` arrives, auto-validate or pick a new key
  //  • give you back [selectedKey, setSelectedKey]
  const { selectedKey, setSelectedKey } = useSelectedAccountKey(accountAddresses);

  return (
    <SelectedAccountContext.Provider
      value={{
        selectedAccountKey: selectedKey,
        setSelectedAccountKey: setSelectedKey,
      }}
    >
      {children}
    </SelectedAccountContext.Provider>
  );
}

export function useSelectedAccount() {
  const ctx = useContext(SelectedAccountContext);
  if (!ctx) throw new Error("useSelectedAccount must be under SelectedAccountProvider");
  return ctx;
}

export function useSetSelectedAccountKey() {
  const ctx = useContext(SelectedAccountContext);
  if (!ctx) throw new Error("useSetSelectedAccountKey must be under SelectedAccountProvider");
  return ctx.setSelectedAccountKey;
}
