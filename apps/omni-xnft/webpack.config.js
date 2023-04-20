const createExpoWebpackConfigAsync = require("@expo/webpack-config");
const webpack = require("webpack");

// Expo CLI will await this method so you can optionally return a promise.
module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.resolve.fallback = {
    fs: false,
    os: false,
    path: false,
  };
  config.devtool.sourceMap = "source-map";
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    })
  );

  // Finally return the new config for the CLI to use.
  return config;
};
