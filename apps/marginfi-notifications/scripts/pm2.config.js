const path = require("path");

module.exports = [
  {
    name: "fetcher",
    script: path.join(__dirname, "../dist/rpcFetcher.js"),
    instances: 1,
    exec_mode: "fork",
  },
  {
    name: "notifications",
    script: path.join(__dirname, "../dist/index.js"),
    wait_ready: false,
    listen_timeout: 5000,
  },
];
