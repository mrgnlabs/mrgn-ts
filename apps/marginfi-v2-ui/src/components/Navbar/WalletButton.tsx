import dynamic from "next/dynamic";
import { FC} from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletButton: FC = () => {
  const wallet = useWallet();

  return (
    <div>
      <WalletMultiButtonDynamic
        className={`${wallet.connected ? "glow-on-hover" : "glow"} bg-transparent px-0 font-aeonik font-[500]`}
      >
        {!wallet.connected && "CONNECT"}
      </WalletMultiButtonDynamic>
    </div>
  );
};

export { WalletButton };
