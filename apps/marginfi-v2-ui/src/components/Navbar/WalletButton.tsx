import dynamic from "next/dynamic";
import { FC } from "react";
import Image from "next/image";
import styles from "./Navbar.module.css";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletButton: FC = () => {
  const wallet = useWallet();

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
