import { DefaultSeoProps } from "next-seo";

const config: DefaultSeoProps = {
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://app.marginfi.com",
    siteName: "marginfi",
    images: [
      {
        url: "https://marginfi-v2-ui-git-staging-mrgn.vercel.app/marginfi-cover.jpg",
        width: 1400,
        height: 630,
        alt: "marginfi",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    handle: "@marginfi",
    site: "@site",
    cardType: "summary_large_image",
  },
};

export default config;
