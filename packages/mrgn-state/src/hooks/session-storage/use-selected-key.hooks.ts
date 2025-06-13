import { PublicKey } from "@solana/web3.js";
import { useState, useEffect, useCallback } from "react";

export function useSelectedAccountKey(keys: PublicKey[] | undefined) {
  const storageKey = "app-selectedAccountKey";
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);

  // 1️⃣ Initialize/pick on first load or when `keys` change
  useEffect(() => {
    if (!keys || keys.length === 0) return;

    const base58Keys = keys.map((k) => k.toBase58());

    const stored = localStorage.getItem(storageKey);
    let initial: string;

    if (stored && base58Keys.includes(stored)) {
      initial = stored;
    } else {
      initial = keys[0].toBase58();
    }

    setSelectedKey(initial);
  }, [keys]);

  // 2️⃣ Persist every time it changes
  useEffect(() => {
    if (selectedKey == null) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, selectedKey);
    }
  }, [selectedKey]);

  // 3️⃣ Setter that validates
  const select = useCallback(
    (key: string) => {
      const base58Keys = keys?.map((k) => k.toBase58());
      if (!base58Keys || !base58Keys?.includes(key)) {
        console.warn(`Cannot select "${key}", not in current keys list.`);
        return;
      }
      setSelectedKey(key);
    },
    [keys]
  );

  return { selectedKey, setSelectedKey: select };
}
