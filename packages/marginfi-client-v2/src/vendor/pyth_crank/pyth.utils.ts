import { ACCUMULATOR_MAGIC, MAJOR_VERSION, MINOR_VERSION, KECCAK160_HASH_SIZE } from "./pyth.consts";

export function getGuardianSetIndex(vaa: Buffer) {
  return vaa.readUInt32BE(1);
}

export const DEFAULT_REDUCED_GUARDIAN_SET_SIZE = 5;
export const VAA_SIGNATURE_SIZE = 66;
export function trimSignatures(vaa: Buffer, n = DEFAULT_REDUCED_GUARDIAN_SET_SIZE): Buffer {
  const currentNumSignatures = vaa[5];
  if (n > currentNumSignatures) {
    throw new Error("Resulting VAA can't have more signatures than the original VAA");
  }

  const trimmedVaa = Buffer.concat([
    vaa.subarray(0, 6 + n * VAA_SIGNATURE_SIZE),
    vaa.subarray(6 + currentNumSignatures * VAA_SIGNATURE_SIZE),
  ]);

  trimmedVaa[5] = n;
  return trimmedVaa;
}

export function isAccumulatorUpdateData(updateBytes: Buffer): boolean {
  return (
    updateBytes.toString("hex").slice(0, 8) === ACCUMULATOR_MAGIC &&
    updateBytes[4] === MAJOR_VERSION &&
    updateBytes[5] === MINOR_VERSION
  );
}

export type AccumulatorUpdateData = {
  vaa: Buffer;
  updates: { message: Buffer; proof: number[][] }[];
};

export function parseAccumulatorUpdateData(data: Buffer): AccumulatorUpdateData {
  if (!isAccumulatorUpdateData(data)) {
    throw new Error("Invalid accumulator message");
  }

  let cursor = 6;
  const trailingPayloadSize = data.readUint8(cursor);
  cursor += 1 + trailingPayloadSize;

  // const proofType = data.readUint8(cursor);
  cursor += 1;

  const vaaSize = data.readUint16BE(cursor);
  cursor += 2;

  const vaa = data.subarray(cursor, cursor + vaaSize);
  cursor += vaaSize;

  const numUpdates = data.readUInt8(cursor);
  const updates = [];
  cursor += 1;

  for (let i = 0; i < numUpdates; i++) {
    const messageSize = data.readUint16BE(cursor);
    cursor += 2;
    const message = data.subarray(cursor, cursor + messageSize);
    cursor += messageSize;

    const numProofs = data.readUInt8(cursor);
    cursor += 1;
    const proof = [];
    for (let j = 0; j < numProofs; j++) {
      proof.push(Array.from(data.subarray(cursor, cursor + KECCAK160_HASH_SIZE)));
      cursor += KECCAK160_HASH_SIZE;
    }

    updates.push({ message, proof });
  }

  if (cursor !== data.length) {
    throw new Error("Didn't reach the end of the message");
  }

  return { vaa, updates };
}
