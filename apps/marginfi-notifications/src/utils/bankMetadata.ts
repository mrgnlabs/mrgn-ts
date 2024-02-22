import assert from "assert";
import { Infer, array, object, string } from "superstruct";

export interface BankMetadata {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

const BankMetadataRaw = object({
  bankAddress: string(),
  tokenAddress: string(),
  tokenName: string(),
  tokenSymbol: string(),
});
const BankMetadataList = array(BankMetadataRaw);

export type BankMetadataRaw = Infer<typeof BankMetadataRaw>;
export type BankMetadataListRaw = Infer<typeof BankMetadataList>;
export type BankMetadataMap = { [address: string]: BankMetadata };

function parseBankMetadata(bankMetadataRaw: BankMetadataRaw): BankMetadata {
  return {
    tokenAddress: bankMetadataRaw.tokenAddress,
    tokenName: bankMetadataRaw.tokenName,
    tokenSymbol: bankMetadataRaw.tokenSymbol,
  };
}

function parseBankMetadatas(bankMetadataListRaw: BankMetadataListRaw): {
  [symbol: string]: BankMetadata;
} {
  return bankMetadataListRaw.reduce(
    (config, current, _) => ({
      [current.bankAddress]: parseBankMetadata(current),
      ...config,
    }),
    {} as {
      [address: string]: BankMetadata;
    }
  );
}

export async function loadBankMetadatas(): Promise<{
  [address: string]: BankMetadata;
}> {
  const response = await fetch(`https://storage.googleapis.com/mrgn-public/mrgn-bank-metadata-cache.json`, {
    headers: {
      Accept: "application/json",
    },
    method: "GET",
  });

  if (response.status === 200) {
    const responseData = await response.json();
    //@ts-ignore
    assert(responseData, BankMetadataList);
    return parseBankMetadatas(responseData);
  } else {
    throw new Error("Failed to fetch bank metadata");
  }
}
