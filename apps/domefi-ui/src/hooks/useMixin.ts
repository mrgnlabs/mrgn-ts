import { useEffect } from "react";
import shallow from "zustand/shallow";
import { useAppStore, useTokenStore } from "../store";

const useMixin = () => {
  const [user, updateBalances] = useAppStore((s) => [s.user, s.updateBalances], shallow);
  const computerAssets = useTokenStore((s: any) => s.computerAssets);

  useEffect(() => {
    if (!user) return;
    updateBalances(computerAssets);
    const id = window.setInterval(() => {
      updateBalances(computerAssets);
    }, 60 * 1000);
    return () => window.clearInterval(id);
  }, [user, computerAssets, updateBalances]);
};

export { useMixin };
