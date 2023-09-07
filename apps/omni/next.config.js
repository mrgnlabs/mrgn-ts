module.exports = {
  /**
   * Dynamic configuration available for the browser and server.
   * Note: requires `ssr: true` or a `getInitialProps` in `_app.tsx`
   * @link https://nextjs.org/docs/api-reference/next.config.js/runtime-configuration
   */
  publicRuntimeConfig: {
    NODE_ENV: process.env.NODE_ENV,
  },
  transpilePackages: [
    "@mrgnlabs/marginfi-client-v2",
    "@mrgnlabs/mrgn-common",
  ],
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        port: "",
        pathname: "/solana-labs/token-list/main/assets/mainnet/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        port: "",
        pathname: "/certusone/wormhole-token-list/main/assets/**",
      },
      {
        protocol: "https",
        hostname: "cryptologos.cc",
        port: "",
        pathname: "/logos/**",
      },
      {
        protocol: "https",
        hostname: "s2.coinmarketcap.com",
        port: "",
        pathname: "/static/img/coins/64x64/**",
      },
    ],
  },
};
