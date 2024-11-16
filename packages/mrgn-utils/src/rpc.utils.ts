export function generateEndpoint(endpoint: string) {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const timestamp = Math.floor(midnight.getTime() / 1000);
  const key = `${endpoint}-${timestamp}`;
  const hash = Buffer.from(key).toString("base64").replace(/[/+=]/g, "").slice(0, 32);

  return `${endpoint}/${hash}`;
}
