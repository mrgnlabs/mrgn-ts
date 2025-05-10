import Head from "next/head";

type MrgnProps = {
  path: string;
};

export const Meta = ({ path }: MrgnProps) => {
  const customPages: Record<string, { description: string }> = {
    "/": {
      description:
        "Earn high yields with dome's DeFi lending and borrowing protocol using SOL, USDC, USDT, and more. Borrow assets, compound returns, and access instant liquidity in just a few clicks.",
    },
    // "/stake": {
    //   description:
    //     "Unlock high-yield Solana staking on marginfi. Stake your assets, hedge against inflation, and earn yield safely and securely.",
    // },
  };
  const title = `Domelabs Lend ${path !== "/" ? ` - ${path.substring(1)}` : ""}`;
  const description = customPages[path] ? customPages[path].description : null;
  return (
    <Head>
      <title>{title}</title>
      <meta property="og:title" content={title} />
      {description && <meta name="description" content={description} />}
      {description && <meta property="og:description" content={description} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta property="og:url" content="https://app.domefi.online" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="https://app.domefi.online/domefi-cover-1200x630.jpg" />
      <meta property="og:image:alt" content="domefi" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="marginfi" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@domefi" />
      <meta name="twitter:creator" content="@domefi" />
      {/* <meta name="twitter:image" content="https://app.domefi.online/domefi-cover-1200x600.jpg" /> */}
      <meta name="robots" content="index,follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="manifest" href="/manifest.json" />
    </Head>
  );
};
