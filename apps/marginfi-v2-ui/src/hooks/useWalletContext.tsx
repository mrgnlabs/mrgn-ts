import { Wallet } from "@mrgnlabs/mrgn-common";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Magic } from "magic-sdk";

const useWalletContext = () => {
  const walletContextState = useWallet();
  const walletModal = useWalletModal();
  const anchorWallet = useAnchorWallet();
  const { query } = useRouter();

  const magic = new Magic(process.env.NEXT_PUBLIC_MAGIC_API_KEY || "");

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

  const loginWithEmail = async (email: string) => {
    if (!email) return;

    console.log("login with email", email);
    await magic.auth.loginWithEmailOTP({ email });
    const metadata = await magic.user.getMetadata();
    console.log(metadata.publicAddress);
  };

  return {
    wallet,
    walletAddress: wallet?.publicKey,
    isOverride,
    connected: walletContextState.connected,
    openWalletSelector,
    walletContextState,
    loginWithEmail,
  };
};

export { useWalletContext };
