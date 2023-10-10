import dynamic from "next/dynamic";
import { FC } from "react";
import { useWalletContext } from "~/hooks/useWalletContext";
import { AuthModal } from "@moongate/wallet-wrapper-sdk";
import {
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletButton: FC = () => {
  const { connected, walletContextState, openWalletSelector } = useWalletContext();
  const { select } = useWallet();
  const { visible, setVisible } = useWalletModal();

  return (
    <div>
      <AuthModal select={select} connected={connected} setVisible={setVisible}>
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
      </AuthModal>
    </div>
  );
};

export { WalletButton };
