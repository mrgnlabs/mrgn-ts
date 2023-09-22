import dynamic from "next/dynamic";
import { FC } from "react";
import { useWalletContext } from "~/components/useWalletContext";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletButton: FC = () => {
  const { connected, walletContextState, openWalletSelector } = useWalletContext();

  return (
    <div>
      <WalletMultiButtonDynamic style={{ background: "transparent", padding: "0" }}>
        {walletContextState.connecting ? (
          <a
            onClick={walletContextState.connecting ? openWalletSelector : undefined}
            className={"font-aeonik font-[500]"}
          >
            CONNECTING
          </a>
        ) : (
          !connected && <div className={"font-aeonik font-[500]"}>CONNECT</div>
        )}
      </WalletMultiButtonDynamic>
    </div>
  );
};

export { WalletButton };
