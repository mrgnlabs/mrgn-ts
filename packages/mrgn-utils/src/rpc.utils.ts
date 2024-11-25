export function generateEndpoint(endpoint: string, rpcProxyKey: string = "") {
  if (!rpcProxyKey) return endpoint;
  const hash = Buffer.from(rpcProxyKey, "utf8").toString("base64").replace(/[/+=]/g, "");
  return `${endpoint}/${hash}`;
}
