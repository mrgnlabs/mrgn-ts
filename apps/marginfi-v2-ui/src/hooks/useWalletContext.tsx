import { Wallet } from "@mrgnlabs/mrgn-common";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";
import { useWeb3Auth } from "./useWeb3Auth";

const useWalletContext = () => {
  const walletContextState = useWallet();
  const walletModal = useWalletModal();
  const anchorWallet = useAnchorWallet();
  const { web3AuthWalletData, connected, login, logout: web3AuthLogout } = useWeb3Auth();
  const { query } = useRouter();

  const openWalletSelector = useCallback(() => {
    walletModal.setVisible(true);
  }, [walletModal]);

  const { wallet, isOverride }: { wallet: Wallet | undefined; isOverride: boolean } = useMemo(() => {
    const override = query?.wallet as string;
    if (web3AuthWalletData) {
      return {
        wallet: web3AuthWalletData,
        isOverride: false,
      };
    } else if (anchorWallet && override) {
      return {
        wallet: {
          ...anchorWallet,
          publicKey: new PublicKey(override),
        },
        isOverride: true,
      };
    }
    return { wallet: anchorWallet, isOverride: false };
  }, [anchorWallet, web3AuthWalletData, query]);

  const logout = useCallback(() => {
    if (web3AuthWalletData) {
      web3AuthLogout();
    } else {
      walletContextState.disconnect();
    }
  }, [web3AuthWalletData, anchorWallet, web3AuthLogout]);

  return {
    wallet,
    walletAddress: wallet?.publicKey,
    isOverride,
    connected: walletContextState.connected || !!web3AuthWalletData,
    openWalletSelector,
    walletContextState,
    login,
    logout,
  };
};

export { useWalletContext };
