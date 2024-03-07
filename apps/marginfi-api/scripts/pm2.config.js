const path = require("path");

module.exports = [
  {
    name: "fetcher",
    script: path.join(__dirname, "../dist/rpcFetcher.js"),
    instances: 1,
    exec_mode: "fork",
  },
  {
    name: "api",
    script: path.join(__dirname, "../.next/index.js"),
    wait_ready: false,
    listen_timeout: 5000,
  },
];
