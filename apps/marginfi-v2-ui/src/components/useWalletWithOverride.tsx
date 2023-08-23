import { Wallet } from "@mrgnlabs/mrgn-common";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useMemo } from "react";

const useWalletWithOverride = () => {
  const anchorWallet = useAnchorWallet();
  const { query } = useRouter();

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

  return { wallet, isOverride };
};

export { useWalletWithOverride };
