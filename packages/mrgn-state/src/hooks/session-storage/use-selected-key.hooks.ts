import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";

export function useSelectedAccountKey(keys: PublicKey[] | undefined) {
  const queryClient = useQueryClient();
  const storageKey = "marginfi-selected-account-key";

  // Initialize from localStorage
  const [selectedKey, setSelectedKeyState] = useState<string | null>(() => {
    return localStorage.getItem(storageKey);
  });

  // Sync localStorage with state when keys change
  useEffect(() => {
    const storedKey = localStorage.getItem(storageKey);
    if (storedKey && keys) {
      const base58Keys = keys.map((k) => k.toBase58());
      if (base58Keys.includes(storedKey)) {
        setSelectedKeyState(storedKey);
      } else {
        // Invalid key, remove it and auto-select first available
        localStorage.removeItem(storageKey);
        if (base58Keys.length > 0) {
          const firstKey = base58Keys[0];
          localStorage.setItem(storageKey, firstKey);
          setSelectedKeyState(firstKey);
          // Invalidate React Query cache when auto-selecting
          queryClient.invalidateQueries({
            queryKey: ["marginfiAccount"],
          });
        } else {
          setSelectedKeyState(null);
        }
      }
    } else if (keys && keys.length > 0 && !storedKey) {
      // Auto-select first key if none is stored
      const firstKey = keys[0].toBase58();
      localStorage.setItem(storageKey, firstKey);
      setSelectedKeyState(firstKey);
      // Invalidate React Query cache when auto-selecting
      queryClient.invalidateQueries({
        queryKey: ["marginfiAccount"],
      });
    }
  }, [keys, queryClient]);

  // Setter that validates and updates both localStorage and state
  const setSelectedKey = useCallback(
    (key: string) => {
      const base58Keys = keys?.map((k) => k.toBase58());
      if (!base58Keys || !base58Keys?.includes(key)) {
        console.warn(`Setting state to unregistered "${key}"`);
        setSelectedKeyState(key);
        return;
      }

      // Only update if different from current state
      if (key !== selectedKey) {
        console.log("🔍 setSelectedKey - updating from", selectedKey, "to", key);
        localStorage.setItem(storageKey, key);
        setSelectedKeyState(key);

        // Invalidate React Query cache to trigger immediate refetch
        console.log("🔍 setSelectedKey - invalidating marginfiAccount cache");
        queryClient.invalidateQueries({
          queryKey: ["marginfiAccount"],
        });
      } else {
        console.log("🔍 setSelectedKey - no change, key already selected");
      }
    },
    [keys, selectedKey, queryClient]
  );

  return { selectedKey, setSelectedKey };
}
