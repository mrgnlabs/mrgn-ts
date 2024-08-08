import Head from "next/head";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

type MrgnProps = {
  path: string;
  activeGroup?: {
    token: ExtendedBankInfo;
    usdc: ExtendedBankInfo;
  } | null;
};

export const Meta = ({ path }: MrgnProps) => {
  let title = "The Arena";
  let description = "";
  const pageTitlePart = path.split("/").pop();
  const pageTitle = pageTitlePart ? pageTitlePart.charAt(0).toUpperCase() + pageTitlePart.slice(1) : "";

  if (path !== "/") {
    title = pageTitle + " | " + title;
    description = "Memecoin trading, with leverage.";
  }

  if (path.includes("trade/")) {
    title = "custom token info";
    description = "custom token description";
  }

  console.log(path);

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
      <meta property="og:image" content="https://www.thearena.trade/marginfi-arena-cover-1200x630.jpg" />
      <meta property="og:image:alt" content="marginfi" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="marginfi" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@marginfi" />
      <meta name="twitter:creator" content="@marginfi" />
      <meta name="twitter:image" content="https://www.thearena.trade/marginfi-arena-cover-1200x600.jpg" />
      <meta name="robots" content="index,follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
};
