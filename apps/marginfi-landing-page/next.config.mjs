/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@mrgnlabs/marginfi-client-v2", "@mrgnlabs/mrgn-common", "@mrgnlabs/lip-client"],
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      net: false,
      tls: false,
      child_process: false,
      request: false,
      dns: false,
      http2: false,
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        port: "",
        pathname: "/profile_images/**/*",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**/*",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/mrgn-public/**/*",
      },
    ],
  },
};

export default nextConfig;
