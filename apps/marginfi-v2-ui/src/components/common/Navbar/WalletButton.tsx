import { FC } from "react";
import { useWalletContext } from "~/hooks/useWalletContext";
import { AuthModal } from "@moongate/wallet-wrapper-sdk";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletButton: FC = () => {
  const { connected } = useWalletContext();
  const { select } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <div>
      <AuthModal
        select={select}
        connected={connected}
        setVisible={setVisible}
        btnStyles="bg-white rounded-md px-4 text-sm font-aeonik font-[500] text-black"
        modalStyles="bg-[#171C1F] text-white rouded-lg"
      />
    </div>
  );
};

export { WalletButton };
