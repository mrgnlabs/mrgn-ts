import { useEffect } from "react";
import { useAppStore } from "../store";
import shallow from "zustand/shallow";
import { useTokenStore } from "../store";

function useComputer() {
  const [user, account, publicKey, getComputerInfo, getComputerAccount] = useAppStore(
    (s) => [s.user, s.account, s.publicKey, s.getComputerInfo, s.getComputerAccount],
    shallow
  );
  const getComputerAssets = useTokenStore((s: any) => s.getComputerAssets);

  useEffect(() => {
    if (user && !account) {
      const id = window.setInterval(() => {
        getComputerAccount();
      }, 60 * 1000);
      return () => window.clearInterval(id);
    }

    getComputerInfo();
    getComputerAssets();
    const id = window.setInterval(
      () => {
        getComputerInfo();
        getComputerAssets();
      },
      5 * 60 * 1000
    );
    return () => window.clearInterval(id);
  }, [user, account]);

  useEffect(() => {
    if (!publicKey) return;
    // raydium.setOwner(publicKey)
  }, [publicKey]);
}

export { useComputer };
