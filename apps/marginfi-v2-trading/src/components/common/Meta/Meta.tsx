import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import Head from "next/head";

type MrgnProps = {
  path: string;
  activeGroup?: {
    token: ExtendedBankInfo;
    usdc: ExtendedBankInfo;
  } | null;
};

export const Meta = ({ path, activeGroup }: MrgnProps) => {
  const title = activeGroup ? `${activeGroup.token.meta.tokenSymbol} - the arena` : "the arena - by mrgn";
  return (
    <Head>
      <title>{title}</title>

      {path === "/" && (
        <>
          <meta name="description" content="permissionless leverage trading for memecoins, built on marginfi." />
          <meta property="og:description" content="permissionless leverage trading for memecoins, built on marginfi." />
          <meta
            name="twitter:description"
            content="permissionless leverage trading for memecoins, built on marginfi."
          />
        </>
      )}
      <meta property="og:title" content={title} />
      <meta property="og:url" content="https://marginfi-v2-trading-mrgn.vercel.app/" />
      <meta property="og:type" content="website" />
      <meta
        property="og:image"
        content="https://marginfi-v2-trading-mrgn.vercel.app/marginfi-arena-cover-1200x630.jpg"
      />
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
      <meta
        name="twitter:image"
        content="https://marginfi-v2-trading-mrgn.vercel.app/marginfi-arena-cover-1200x600.jpg"
      />
      <meta name="robots" content="index,follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="manifest" href="/manifest.json" />
    </Head>
  );
};
