import dynamic from "next/dynamic";
import { FC, useEffect } from "react";
import Image from "next/image";
import styles from "./Navbar.module.css";
import { useWallet } from "@solana/wallet-adapter-react";
import { v4 as uuidv4 } from "uuid";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletButton: FC = () => {
  const wallet = useWallet();

  useEffect(() => {
    console.log({ walletConnected: wallet.connected });
    if (wallet && wallet.connected && wallet.publicKey) {
      console.log('authenticating user - client side');

      const uuid = uuidv4();
      const encodedMessage = new TextEncoder().encode(uuid);

      //@ts-ignore
      wallet.signMessage(encodedMessage)
        .then((signature) => {
          // Now we have the signature, send this back to your server
          return fetch('/api/authUser', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              publicKey: wallet?.publicKey?.toBase58(),
              signature,
              uuid,
            }),
          });
        })
        .then(response => response.json())
        .then(data => console.log(data)) // Log the response for now
        .catch(error => console.error('Error:', error));
    }
  }, [wallet.connected]);

  return (
    <WalletMultiButtonDynamic
      className={styles["wallet-button"]}
      startIcon={<Image src="/wallet_icon.svg" alt="wallet icon" width={18.9} height={18.9} />}
    >
      {!wallet.connected && "CONNECT"}
    </WalletMultiButtonDynamic>
  );
};

export { WalletButton };
