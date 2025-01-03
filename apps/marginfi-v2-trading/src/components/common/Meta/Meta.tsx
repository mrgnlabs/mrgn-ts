import Head from "next/head";

import { PoolListApiResponse } from "~/types/api.types";
import { TokenData } from "~/types";

type MrgnProps = {
  groupPk?: string | null;
  poolData?: PoolListApiResponse[] | null;
  tokenDetails?: TokenData[] | null;
  baseUrl?: string;
};

export const Meta = ({ groupPk, poolData, tokenDetails, baseUrl }: MrgnProps) => {
  const _baseUrl = baseUrl ?? process.env.NEXT_PUBLIC_VERCEL_URL ?? "http://localhost:3006";
  let title = "The Arena";
  let description = "Memecoin trading, with leverage.";
  let image = `${_baseUrl}/metadata/metadata-image-default.png`;

  if (groupPk) {
    const _poolData = poolData?.find((pool) => pool.group === groupPk);
    if (!_poolData) return;
    const _tokenDetails = tokenDetails?.find(
      (token) => token.address === _poolData?.base_bank?.mint.address.toString()
    );
    if (!_tokenDetails) return;
    const _quoteTokenDetails = tokenDetails?.find(
      (token) => token.address === _poolData?.quote_banks[0]?.mint.address.toString()
    );
    if (!_quoteTokenDetails) return;
    title = `Trade ${_tokenDetails?.symbol}/${_quoteTokenDetails?.symbol} with leverage in The Arena.`;
    description = `Trade ${_tokenDetails?.symbol} / ${_quoteTokenDetails?.symbol} with leverage in The Arena.`;
    image = `${_baseUrl}/api/share-image/generate?tokenSymbol=${_tokenDetails?.symbol}&tokenImageUrl=${_tokenDetails?.imageUrl}&quoteTokenSymbol=${_quoteTokenDetails?.symbol}&quoteTokenImageUrl=${_quoteTokenDetails?.imageUrl}`;
  }

  return (
    <Head>
      <title>{title}</title>

      {description.length > 0 && (
        <>
          <meta name="description" content={description} />
          <meta property="og:description" content={description} />
          <meta name="twitter:description" content={description} />
        </>
      )}

      <meta property="og:title" content={title} />
      <meta property="og:url" content="https://www.thearena.trade/" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content="thearena" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="thearena" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@thearenatrade" />
      <meta name="twitter:creator" content="@thearenatrade" />
      <meta name="twitter:image" content={image} />
      <meta name="robots" content="index,follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
};
