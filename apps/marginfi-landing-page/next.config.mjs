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
    ],
  },
};

export default nextConfig;
