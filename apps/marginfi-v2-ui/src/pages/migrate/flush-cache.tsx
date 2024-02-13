import React from "react";

import { useWalletContext } from "~/hooks/useWalletContext";

export default function FlushCache() {
  const { connected, wallet } = useWalletContext();

  React.useEffect(() => {
    if (!connected || !wallet) return;
    localStorage.removeItem(`marginfi_accounts-${wallet.publicKey.toBase58()}`);
    window.location.href = "/";
  }, [connected, wallet]);
}
