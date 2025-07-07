import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const base58ToUint8Array = (base58PrivateKey: string): Uint8Array => {
  try {
    const privateKeyUint8Array = bs58.decode(base58PrivateKey);
    return privateKeyUint8Array;
  } catch (error) {
    throw new Error("Invalid Base58 private key.");
  }
};

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error("Please provide a Base58 private key as an argument.");
    process.exit(1);
  }

  const privateKey = args[0];

  try {
    const uint8Array = base58ToUint8Array(privateKey);
    console.log(JSON.stringify(Array.from(uint8Array)));
  } catch (error) {
    console.error("Failed to convert private key:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
