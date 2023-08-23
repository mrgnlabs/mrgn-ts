import { Wallet } from "@mrgnlabs/mrgn-common";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useMemo } from "react";

const useWalletWithOverride = () => {
  const anchorWallet = useAnchorWallet();
  const { query } = useRouter();

  const wallet: Wallet | undefined = useMemo(() => {
    const override = query?.wallet as string;
    if (anchorWallet && override) {
      return {
        ...anchorWallet,
        publicKey: new PublicKey(override),
      };
    }
    return anchorWallet;
  }, [anchorWallet, query]);

  return { wallet };
};

export { useWalletWithOverride };
