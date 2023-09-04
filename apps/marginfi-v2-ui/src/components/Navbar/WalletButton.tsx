import dynamic from "next/dynamic";
import { FC } from "react";
import { useWalletContext } from "../useWalletContext";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletButton: FC = () => {
  const { connected } = useWalletContext();

  return (
    <div>
      <WalletMultiButtonDynamic style={{ background: "transparent", padding: "0" }}>
        {!connected && <div className={"font-aeonik font-[500]"}>CONNECT</div>}
      </WalletMultiButtonDynamic>
    </div>
  );
};

export { WalletButton };
