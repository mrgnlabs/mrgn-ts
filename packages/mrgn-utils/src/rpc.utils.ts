export function generateEndpoint(endpoint: string, rpcProxyKey: string = "") {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const timestamp = Math.floor(midnight.getTime() / 1000);
  const key = `${endpoint}-${timestamp}-${rpcProxyKey}`;
  const hash = Buffer.from(key, "utf8").toString("base64").replace(/[/+=]/g, "");
  console.log("key", key, hash);

  return `${endpoint}/${hash}`;
}
