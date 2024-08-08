import Head from "next/head";

import { BankMetadataRaw } from "@mrgnlabs/mrgn-common";

type MrgnProps = {
  path: string;
  bank: BankMetadataRaw | null;
};

const GCP_URL = "https://storage.googleapis.com/mrgn-public/mrgn-trade-token-share-images";

export const Meta = ({ path, bank }: MrgnProps) => {
  let title = "The Arena";
  let description = "Memecoin trading, with leverage";
  let image = GCP_URL + "/default.jpg";
  const pageTitlePart = path.split("/").pop();
  const pageTitle = pageTitlePart ? pageTitlePart.charAt(0).toUpperCase() + pageTitlePart.slice(1) : "";

  if (path !== "/") {
    title = pageTitle + " - The Arena";
    description = "";
  }

  if (bank) {
    title = bank.tokenSymbol + " - The Arena";
    description = `Long / shot ${bank.tokenSymbol} with leverage in The Arena.`;
    image = GCP_URL + `/${bank.tokenAddress}.jpg`;
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
