import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, Provider, Wallet } from "@coral-xyz/anchor";

import { useConnection } from "~/hooks/useConnection";
import { XnftWallet } from "~/types/xnftTypes";
import { solanaSignTransaction } from "~/utils";

export function useWallet() {
  const [solanaPublicKey, setSolanaPublicKey] = useState<PublicKey>();
  const [provider, setProvider] = useState<Provider>();
  const [wallet, setWallet] = useState<Wallet>();
  const connection = useConnection();

  useEffect(() => {
    if (connection) {
      setProvider(
        new AnchorProvider(
          connection,
          { publicKey: new PublicKey("3rpcmBeq3LcdTxez1sdi8vf61ofpxFpKrr7iViEWykAR") } as Wallet,
          AnchorProvider.defaultOptions()
        )
      );
    }
  }, [connection, window?.xnft?.solana, setProvider]);

  useEffect(() => {
    const wallet = {
      publicKey: new PublicKey("3rpcmBeq3LcdTxez1sdi8vf61ofpxFpKrr7iViEWykAR"),
      // signTransaction: solanaSignTransaction,
    } as Wallet; //new Wallet({ publicKey: new PublicKey(key) } as Keypair);
    setWallet(wallet);
    setSolanaPublicKey(new PublicKey("3rpcmBeq3LcdTxez1sdi8vf61ofpxFpKrr7iViEWykAR"));
  }, [setSolanaPublicKey]);
  return {
    publicKey: solanaPublicKey,
    provider,
    wallet,
  };
}
