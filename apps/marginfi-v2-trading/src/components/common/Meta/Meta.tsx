import Head from "next/head";

type MrgnProps = {
  path: string;
};

export const Meta = ({ path }: MrgnProps) => {
  const title = `marginfi ${path !== "/" ? ` - ${path.substring(1)}` : ""}`;
  return (
    <Head>
      <title>{title}</title>

      {path === "/" && (
        <>
          <meta name="description" content="marginfi is a decentralized lending and borrowing protocol on Solana." />
          <meta
            property="og:description"
            content="marginfi is a decentralized lending and borrowing protocol on Solana."
          />
          <meta
            name="twitter:description"
            content="marginfi is a decentralized lending and borrowing protocol on Solana."
          />
        </>
      )}
      <meta property="og:title" content={title} />
      <meta property="og:url" content="https://app.marginfi.com" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="https://app.marginfi.com/marginfi-cover-1200x630.jpg" />
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
      <meta name="twitter:image" content="https://app.marginfi.com/marginfi-cover-1200x600.jpg" />
      <meta name="robots" content="index,follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="manifest" href="/manifest.json" />
    </Head>
  );
};
