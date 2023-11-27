import { useConnection } from "~/hooks/useConnection";
import { PublicKey } from "@solana/web3.js";
import { FC, useMemo } from "react";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useMrgnlendStore } from "~/store";
import { collectRewardsBatch } from "~/utils";
import { EMISSION_MINT_INFO_MAP } from "../desktop/AssetsList/AssetRow";

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
    <button
      className="btn-gleam w-1/2 h-12 flex items-center justify-center px-2 bg-gradient-to-tr from-[#DCE85DBB] to-[#22282C] rounded-md outline outline-2 outline-offset-2 outline-[#DCE85DBB] max-w-[260px]"
      onClick={async () => {
        if (!wallet || !selectedAccount || bankAddressesWithEmissions.length === 0) return;
        await collectRewardsBatch(connection, wallet, selectedAccount, bankAddressesWithEmissions);
      }}
    >
      <div className="text-white text-normal font-[500]">Collect LM rewards</div>
    </button>
  );
};

export { EmissionsBanner };
