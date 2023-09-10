module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "~/assets": "./src/assets",
            "~/context": "./src/context",
            "~/components": "./src/components",
            "~/utils": "./src/utils",
            "~/lib": "./src/lib",
            "~/models": "./src/models",
            "~/types": "./src/types",
            "~/config": "./src/config",
            "~/api": "./src/api",
            "~/idls": "./src/idls",
            "~/consts": "./src/consts",
            "~/screens": "./src/screens",
            "~/store": "./src/store",
            "~/styles": "./src/styles",
            "~/routes": "./src/routes",
            "~/services": "./src/services",
            "~/hooks": "./src/hooks",
            "~/shared": "./src/shared",
          },
        },
      ],
      ["@babel/plugin-transform-class-properties", { loose: true }],
      ["@babel/plugin-transform-private-methods", { loose: true }],
      ["@babel/plugin-transform-private-property-in-object", { loose: true }],
      [
        "module:react-native-dotenv",
        {
          envName: "APP_ENV",
          moduleName: "@env",
          path: ".env",
        },
      ],
    ],
  };
};
