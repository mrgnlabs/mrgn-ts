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
    if (connection && window.xnft?.solana) {
      setProvider(
        new AnchorProvider(
          connection,
          new XnftWallet(window.xnft.solana),
          AnchorProvider.defaultOptions(),
        ),
      );
    }
  }, [connection, window.xnft?.solana, setProvider]);

  useEffect(() => {
    if (window.xnft?.publicKeys?.solana) {
      const key = window.xnft?.publicKeys?.solana;
      const wallet = {
        publicKey: new PublicKey(key),
        signTransaction: solanaSignTransaction,
      } as Wallet; //new Wallet({ publicKey: new PublicKey(key) } as Keypair);
      setWallet(wallet);
      setSolanaPublicKey(new PublicKey(key));
    }
  }, [window.xnft?.publicKeys?.solana, setSolanaPublicKey]);
  return {
    publicKey: solanaPublicKey,
    provider,
    wallet,
  };
}
