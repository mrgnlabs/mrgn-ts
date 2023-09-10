const createExpoWebpackConfigAsync = require("@expo/webpack-config");
const webpack = require("webpack");

// Expo CLI will await this method so you can optionally return a promise.
module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ["@solana/web3.js", "@solana/spl-token"],
      },
    },
    argv
  );

  config.resolve.fallback = {
    fs: false,
    os: false,
    path: false,
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer"),
  };

  config.devtool.sourceMap = "source-map";

  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    })
  );

  config.module.rules = config.module.rules.map((rule) => {
    if (rule.oneOf instanceof Array) {
      rule.oneOf[rule.oneOf.length - 1].exclude = [/\.(js|mjs|jsx|cjs|ts|tsx)$/, /\.html$/, /\.json$/];
    }
    return rule;
  });

  config.module.rules.push({
    test: /\.m?js/,
    resolve: {
      fullySpecified: false,
    },
  });

  config.module.rules.push({
    test: /\.(js|mjs|cjs)$/,
    resolve: {
      fullySpecified: false,
    },
  });

  config.module.rules.push({
    test: /\.mjs$/,
    include: /node_modules/,
    type: "javascript/auto",
  });

  config.module.rules.push({
    test: /\.(ts|tsx|js|jsx)$/,
    exclude: /node_modules/,
    use: [
      {
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-env", "@babel/preset-react"],
        },
      },
    ],
  });

  config.module.rules.push({
    test: /\.m?ts$|\.tsx?$/,
    use: [
      {
        loader: "ts-loader",
        options: {
          onlyCompileBundledFiles: true,
          compilerOptions: {
            noEmit: false,
          },
        },
      },
    ],
  });

  // Finally return the new config for the CLI to use.
  return config;
};
