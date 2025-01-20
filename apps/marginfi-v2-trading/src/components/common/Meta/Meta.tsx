import Head from "next/head";

type MetaProps = {
  finalMetadata: {
    title: string;
    description: string;
    image: string;
  };
};

export const Meta = ({ finalMetadata }: MetaProps) => {
  const { title, description, image } = finalMetadata;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="thearena" />
      <meta property="og:image:alt" content="thearena" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="720" />
      <meta property="og:image:height" content="360" />
      <meta property="og:url" content="https://www.thearena.trade/" />

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@thearenatrade" />
      <meta name="twitter:creator" content="@thearenatrade" />

      <meta name="robots" content="index,follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
};
