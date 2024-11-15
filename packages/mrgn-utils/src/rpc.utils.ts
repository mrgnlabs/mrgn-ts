export async function generateEndpoint(endpoint: string) {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const timestamp = Math.floor(midnight.getTime() / 1000);
  const msgUint8 = new TextEncoder().encode(`${endpoint}-${timestamp}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return `${endpoint}/${hash}`;
}
