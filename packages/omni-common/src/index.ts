import { TokenMetadata } from "@mrgnlabs/marginfi-client-v2";
import axios from "axios";
import tokenInfos from "./token_info.json";
import { object, string, number, array, Infer, assert } from "superstruct";

interface HandlePromptSubmitParams {
  input: string;
  walletPublicKey?: string;
  onBeforeSubmit: () => void;
  onSubmitSuccess: (data: any) => void;
  onSubmitError: () => void;
  onActionStart: () => void;
  onActionEnd: (error: boolean) => void;
  action: (data: any) => Promise<boolean>;
  url: string;
}

const handlePromptSubmit = async ({
  input,
  walletPublicKey,
  onBeforeSubmit,
  onSubmitSuccess,
  onSubmitError,
  onActionStart,
  onActionEnd,
  action,
  url,
}: HandlePromptSubmitParams) => {
  onBeforeSubmit();

  try {
    const res = await axios.post(url, {
      input,
      walletPublicKey,
    });

    onSubmitSuccess(res.data);

    if (res.data.data) {
      onActionStart();
      const actionSuccess = await action({ ...res.data.data });
      onActionEnd(!actionSuccess);
    }
  } catch (error) {
    console.error("Error calling API route:", error);
    onSubmitError();
  }
};

export { handlePromptSubmit };

export * from "./types";

// ================ token metadata ================

const TokenMetadataRaw = object({
  address: string(),
  chainId: number(),
  decimals: number(),
  name: string(),
  symbol: string(),
  logoURI: string(),
  extensions: object({
    coingeckoId: string(),
  }),
});
const TokenMetadataList = array(TokenMetadataRaw);

export type TokenMetadataRaw = Infer<typeof TokenMetadataRaw>;
export type TokenMetadataListRaw = Infer<typeof TokenMetadataList>;

function parseTokenMetadata(tokenMetadataRaw: TokenMetadataRaw): TokenMetadata {
  return {
    icon: tokenMetadataRaw.logoURI,
  };
}

function parseTokenMetadatas(tokenMetadataListRaw: TokenMetadataListRaw): {
  [symbol: string]: TokenMetadata;
} {
  return tokenMetadataListRaw.reduce(
    (config, current, _) => ({
      [current.symbol]: parseTokenMetadata(current),
      ...config,
    }),
    {} as {
      [symbol: string]: TokenMetadata;
    }
  );
}

export function loadTokenMetadatas(): {
  [symbol: string]: TokenMetadata;
} {
  assert(tokenInfos, TokenMetadataList);
  return parseTokenMetadatas(tokenInfos);
}
