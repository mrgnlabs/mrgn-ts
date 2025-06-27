import { PublicKey } from "@solana/web3.js";
import { useState, useEffect, useCallback } from "react";

export function useSelectedAccountKey(keys?: PublicKey[]) {
  const storageKey = "app-selectedAccountKey";

  // Initialize state with value from localStorage
  const [selectedKey, setSelectedKeyState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null; // SSR safety
    return localStorage.getItem(storageKey);
  });

  // Initialize/pick on first load or when `keys` change
  useEffect(() => {
    if (!keys || keys.length === 0) {
      setSelectedKeyState(null);
      return;
    }

    const base58Keys = keys.map((k) => k.toBase58());
    const stored = localStorage.getItem(storageKey);
    let initial: string;

    if (stored && base58Keys.includes(stored)) {
      initial = stored;
    } else {
      initial = keys[0].toBase58();
    }

    // Only update if different from current state
    if (initial !== selectedKey) {
      localStorage.setItem(storageKey, initial);
      setSelectedKeyState(initial);
    }
  }, [keys, selectedKey]);

  // Setter that validates and updates both localStorage and state
  const setSelectedKey = useCallback(
    (key: string) => {
      const base58Keys = keys?.map((k) => k.toBase58());
      if (!base58Keys || !base58Keys?.includes(key)) {
        console.warn(`Cannot select "${key}", not in current keys list.`);
        return;
      }

      // Only update if different from current state
      if (key !== selectedKey) {
        localStorage.setItem(storageKey, key);
        setSelectedKeyState(key);
      }
    },
    [keys, selectedKey]
  );

  return { selectedKey, setSelectedKey };
}
