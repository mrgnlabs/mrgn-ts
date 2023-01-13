// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
// }

// module.exports = nextConfig

const withTM = require("next-transpile-modules")([
  "@mrgnlabs/marginfi-client-v2",
]);

module.exports = withTM({
  reactStrictMode: true,
  /**
   * Dynamic configuration available for the browser and server.
   * Note: requires `ssr: true` or a `getInitialProps` in `_app.tsx`
   * @link https://nextjs.org/docs/api-reference/next.config.js/runtime-configuration
   */
  publicRuntimeConfig: {
    NODE_ENV: process.env.NODE_ENV,
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
  // async redirects() {
  //   return [
  //     {
  //       source: "/vault",
  //       destination: "/waiting-room",
  //       permanent: false,
  //     },
  //   ];
  // },
});
