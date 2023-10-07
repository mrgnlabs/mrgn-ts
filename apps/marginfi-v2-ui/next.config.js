const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer({
  /**
   * Dynamic configuration available for the browser and server.
   * Note: requires `ssr: true` or a `getInitialProps` in `_app.tsx`
   * @link https://nextjs.org/docs/api-reference/next.config.js/runtime-configuration
   */
  publicRuntimeConfig: {
    NODE_ENV: process.env.NODE_ENV,
  },
  transpilePackages: ["@mrgnlabs/marginfi-client-v2", "@mrgnlabs/mrgn-common", "@mrgnlabs/lip-client"],
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false, net: false, tls: false, child_process: false, request: false };
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
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/token-metadata/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/static-marginfi/**",
      },
      {
        protocol: "https",
        hostname: "arweave.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "shdw-drive.genesysgo.net",
        port: "",
        pathname: "/6tcnBSybPG7piEDShBcrVtYJDPSvGrDbVvXmXKpzBvWP/**",
      },
      {
        protocol: "https",
        hostname: "solblaze.org",
        port: "",
        pathname: "/assets/**",
      },
    ],
  },
});

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,

    org: "mrgn-labs",
    project: "marginfi-v2-ui",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  }
);
