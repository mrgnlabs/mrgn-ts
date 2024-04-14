const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

let config = withBundleAnalyzer({
  /**
   * Dynamic configuration available for the browser and server.
   * Note: requires `ssr: true` or a `getInitialProps` in `_app.tsx`
   * @link https://nextjs.org/docs/api-reference/next.config.js/runtime-configuration
   */
  publicRuntimeConfig: {
    NODE_ENV: process.env.NODE_ENV,
  },
  rewrites: async () => {
    return [
      {
        source: "/rpc",
        destination: process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || "https://mrgn.rpcpool.com/",
      },
    ];
  },
  transpilePackages: ["@mrgnlabs/marginfi-client-v2", "@mrgnlabs/mrgn-common", "@mrgnlabs/lip-client"],
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      net: false,
      tls: false,
      child_process: false,
      request: false,
    };
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
        hostname: "storage.googleapis.com",
        pathname: "/mrgn-public/mrgn-token-icons/**",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        pathname: "/profile_images/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        port: "",
        pathname: "/profile_images/**",
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
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "solblaze.org",
        port: "",
        pathname: "/assets/**",
      },
      {
        protocol: "https",
        hostname: "s.gravatar.com",
        port: "",
        pathname: "/avatar/**",
      },
      {
        protocol: "https",
        hostname: "pyth.network",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "metadata.jito.network",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.jup.ag",
        port: "",
        pathname: "/jlp/**",
      },
      {
        protocol: "https",
        hostname: "metadata.jito.network",
        port: "",
        pathname: "/token/**",
      },
      {
        protocol: "https",
        hostname: "static.jup.ag",
        port: "",
        pathname: "/jup/**",
      },
      {
        protocol: "https",
        hostname: "bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.jup.ag",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "hivemapper-marketing-public.s3.us-west-2.amazonaws.com",
        port: "",
        pathname: "/Hivemapper_HONEY_token.png",
      },
    ],
  },
});

const { withSentryConfig } = require("@sentry/nextjs");

config = withSentryConfig(
  config,
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

module.exports = withPWA(config);
