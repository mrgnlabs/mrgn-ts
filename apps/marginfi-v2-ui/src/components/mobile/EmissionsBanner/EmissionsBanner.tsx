import { useConnection } from "~/hooks/useConnection";
import { PublicKey } from "@solana/web3.js";
import { FC, useMemo } from "react";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useMrgnlendStore } from "~/store";
import { collectRewardsBatch } from "~/utils";
import { Button } from "~/components/ui/button";
import { IconConfetti } from "~/components/ui/icons";
import { EMISSION_MINT_INFO_MAP } from "~/components/desktop/AssetList/components";

const EmissionsBanner: FC = () => {
  const { connection } = useConnection();
  const { wallet } = useWalletContext();
  const [selectedAccount, extendedBankInfos] = useMrgnlendStore((state) => [
    state.selectedAccount,
    state.extendedBankInfos,
  ]);

  const bankAddressesWithEmissions: PublicKey[] = useMemo(() => {
    if (!selectedAccount) return [];
    return [...EMISSION_MINT_INFO_MAP.keys()]
      .map((bankMintSymbol) => {
        const uxdBankInfo = extendedBankInfos?.find((b) => b.isActive && b.meta.tokenSymbol === bankMintSymbol);
        return uxdBankInfo?.address;
      })
      .filter((address) => address !== undefined) as PublicKey[];
  }, [selectedAccount, extendedBankInfos]);

  if (bankAddressesWithEmissions.length === 0) return null;

  return (
    <Button
      size="lg"
      onClick={async () => {
        if (!wallet || !selectedAccount || bankAddressesWithEmissions.length === 0) return;
        await collectRewardsBatch(connection, wallet, selectedAccount, bankAddressesWithEmissions);
      }}
      className="mt-8 rounded-full"
    >
      <IconConfetti /> Collect LM rewards
    </Button>
  );
};

export { EmissionsBanner };
