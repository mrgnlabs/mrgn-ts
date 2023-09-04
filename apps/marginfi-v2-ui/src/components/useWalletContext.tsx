import { Wallet } from "@mrgnlabs/mrgn-common";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";

const useWalletContext = () => {
  const walletContextState = useWallet();
  const walletModal = useWalletModal();
  const anchorWallet = useAnchorWallet();
  const { query } = useRouter();

  const openWalletSelector = useCallback(() => {
    walletModal.setVisible(true);
  }, [walletModal]);

  const { wallet, isOverride }: { wallet: Wallet | undefined; isOverride: boolean } = useMemo(() => {
    const override = query?.wallet as string;
    if (anchorWallet && override) {
      return {
        wallet: {
          ...anchorWallet,
          publicKey: new PublicKey(override),
        },
        isOverride: true,
      };
    }
    return { wallet: anchorWallet, isOverride: false };
  }, [anchorWallet, query]);

  return { wallet, walletAddress: wallet?.publicKey, isOverride, connected: walletContextState.connected, openWalletSelector, walletContextState };
};

export { useWalletContext };
