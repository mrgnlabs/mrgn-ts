import Head from "next/head";

type MrgnProps = {
  path: string;
  title?: string;
};

export const Meta = ({ path, title }: MrgnProps) => {
  const customPages: Record<string, { description: string }> = {
    "/": {
      description: "Liquidity, Yield, Leverage.",
    },
  };
  const finalTitle = (title || `${path !== "/" ? `${path.substring(1)}` : "lend"}`) + " - marginfi";
  const description = customPages[path] ? customPages[path].description : null;
  return (
    <Head>
      <title>{finalTitle}</title>
      <meta property="og:title" content={finalTitle} />
      {description && <meta name="description" content={description} />}
      {description && <meta property="og:description" content={description} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta property="og:url" content="https://app.marginfi.com" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${process.env.NEXT_PUBLIC_BASE_URL}/marginfi-banner.png`} />
      <meta property="og:image:alt" content="marginfi" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="marginfi" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@marginfi" />
      <meta name="twitter:creator" content="@marginfi" />
      <meta name="twitter:image" content={`${process.env.NEXT_PUBLIC_BASE_URL}/marginfi-banner.png`} />
      <meta name="robots" content="index,follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="manifest" href="/manifest.json" />
    </Head>
  );
};
