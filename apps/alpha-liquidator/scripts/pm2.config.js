const path = require("path");

module.exports = [
  {
    name: "fetcher",
    script: path.join(__dirname, "../dist/rpcFetcher.js"),
    instances: 1,
    exec_mode: "fork",
  },
  {
    name: "liquidator",
    script: path.join(__dirname, "../dist/runLiquidator.js"),
    wait_ready: false,
    listen_timeout: 5000,
    env_development: {
      IS_DEV: "true",
    },
  },
];
