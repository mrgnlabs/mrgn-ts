const environment = process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT;
const rpcEndpointOverride = process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE;

let rpcEndpoint;
switch (environment) {
  case "production":
    rpcEndpoint = rpcEndpointOverride || "https://mrgn.rpcpool.com/";
    break;
  case "alpha":
    rpcEndpoint = rpcEndpointOverride || "https://mrgn.rpcpool.com/";
    break;
  case "staging":
    rpcEndpoint = rpcEndpointOverride || "https://mrgn.rpcpool.com/";
    break;
  case "dev":
    rpcEndpoint = rpcEndpointOverride || "https://devnet.rpcpool.com/";
    break;
  default:
    rpcEndpoint = rpcEndpointOverride || "https://devnet.rpcpool.com/";
}

const config = {
  rpcEndpoint,
};

export default config;
