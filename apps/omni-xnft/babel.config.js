module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "nativewind/babel",
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            /**
             * Regular expression is used to match all files inside `./src` directory and map each `.src/folder/[..]` to `~folder/[..]` path
             */
            "^~(.+)": "./src/\\1",
          },
          extensions: [".ios.js", ".android.js", ".js", ".jsx", ".json", ".tsx", ".ts", ".native.js"],
        },
      ],
    ],
  };
};
