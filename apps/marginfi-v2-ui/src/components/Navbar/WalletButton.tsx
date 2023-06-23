import dynamic from "next/dynamic";
import { FC, useEffect } from "react";
import Image from "next/image";
import styles from "./Navbar.module.css";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletButton: FC = () => {
  const wallet = useWallet();

  useEffect(() => {
    if (wallet.connected) {
      console.log('authenticating user - client side');
      // When the wallet is connected, we send the public key to our endpoint to authenticate or create the user
      fetch('/api/authUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicKey: wallet.publicKey?.toBase58() }),
      })
        .then(response => response.json())
        .then(data => console.log(data)) // Log the response for now
        .catch(error => console.error('Error:', error));
    }
  }, [wallet.publicKey, wallet.connected]);

  return (
    <WalletMultiButtonDynamic
      className={styles["wallet-button"]}
      // @todo height / width doesn't seem to be making a difference here
      startIcon={<Image src="/wallet_icon.svg" alt="wallet icon" width={18.9} height={18.9} />}
    >
      {!wallet.connected && "CONNECT"}
    </WalletMultiButtonDynamic>
  );
};

export { WalletButton };
