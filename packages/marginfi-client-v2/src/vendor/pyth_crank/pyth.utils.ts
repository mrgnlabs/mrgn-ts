import { BN, Program } from "@coral-xyz/anchor";
import {
  ACCUMULATOR_MAGIC,
  MAJOR_VERSION,
  MINOR_VERSION,
  KECCAK160_HASH_SIZE,
  INIT_ENCODED_VAA_COMPUTE_BUDGET,
  VAA_SPLIT_INDEX,
  WRITE_ENCODED_VAA_COMPUTE_BUDGET,
  VERIFY_ENCODED_VAA_COMPUTE_BUDGET,
  CLOSE_ENCODED_VAA_COMPUTE_BUDGET,
  VAA_START,
  PRICE_FEED_MESSAGE_VARIANT,
} from "./pyth.consts";
import { WormholeCoreBridgeSolana } from "./idl";
import { Keypair, PublicKey, Signer, TransactionInstruction } from "@solana/web3.js";

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

/**
 * An instruction with some extra information that will be used to build transactions.
 */
export type InstructionWithEphemeralSigners = {
  /** The instruction */
  instruction: TransactionInstruction;
  /** The ephemeral signers that need to sign the transaction where this instruction will be */
  signers: Signer[];
  /** The compute units that this instruction requires, useful if greater than `DEFAULT_COMPUTE_BUDGET_UNITS`  */
  computeUnits?: number;
};
interface VaaInstructionGroups {
  initInstructions: InstructionWithEphemeralSigners[];
  writeFirstPartInstructions: InstructionWithEphemeralSigners[];
  writeSecondPartAndVerifyInstructions: InstructionWithEphemeralSigners[];
  closeInstructions: InstructionWithEphemeralSigners[];
  encodedVaaAddress: PublicKey;
}

export async function buildPostEncodedVaaInstructions(
  wormhole: Program<WormholeCoreBridgeSolana>,
  vaa: Buffer
): Promise<{
  encodedVaaAddress: PublicKey;
  postInstructions: InstructionWithEphemeralSigners[];
  closeInstructions: InstructionWithEphemeralSigners[];
}> {
  const groups = await generateVaaInstructionGroups(wormhole, vaa);

  // Pack instructions for optimal 2-transaction pattern:
  // TX1: init + first write
  // TX2: second write + verify
  return {
    encodedVaaAddress: groups.encodedVaaAddress,
    postInstructions: [
      ...groups.initInstructions,
      ...groups.writeFirstPartInstructions,
      ...groups.writeSecondPartAndVerifyInstructions,
    ],
    closeInstructions: groups.closeInstructions,
  };
}

async function generateVaaInstructionGroups(
  wormhole: Program<WormholeCoreBridgeSolana>,
  vaa: Buffer
): Promise<VaaInstructionGroups> {
  const encodedVaaKeypair = new Keypair();

  // Create and init instructions
  const initInstructions: InstructionWithEphemeralSigners[] = [
    await buildEncodedVaaCreateInstruction(wormhole, vaa, encodedVaaKeypair),
    {
      instruction: await wormhole.methods
        .initEncodedVaa()
        .accounts({
          encodedVaa: encodedVaaKeypair.publicKey,
        })
        .instruction(),
      signers: [],
      computeUnits: INIT_ENCODED_VAA_COMPUTE_BUDGET,
    },
  ];

  // First write instruction
  const writeFirstPartInstructions: InstructionWithEphemeralSigners[] = [
    {
      instruction: await wormhole.methods
        .writeEncodedVaa({
          index: 0,
          data: vaa.subarray(0, VAA_SPLIT_INDEX),
        })
        .accounts({
          draftVaa: encodedVaaKeypair.publicKey,
        })
        .instruction(),
      signers: [],
      computeUnits: WRITE_ENCODED_VAA_COMPUTE_BUDGET,
    },
  ];

  // Second write and verify instructions
  const writeSecondPartAndVerifyInstructions: InstructionWithEphemeralSigners[] = [
    {
      instruction: await wormhole.methods
        .writeEncodedVaa({
          index: VAA_SPLIT_INDEX,
          data: vaa.subarray(VAA_SPLIT_INDEX),
        })
        .accounts({
          draftVaa: encodedVaaKeypair.publicKey,
        })
        .instruction(),
      signers: [],
      computeUnits: WRITE_ENCODED_VAA_COMPUTE_BUDGET,
    },
    {
      instruction: await wormhole.methods
        .verifyEncodedVaaV1()
        .accounts({
          guardianSet: getGuardianSetPda(getGuardianSetIndex(vaa), wormhole.programId),
          draftVaa: encodedVaaKeypair.publicKey,
        })
        .instruction(),
      signers: [],
      computeUnits: VERIFY_ENCODED_VAA_COMPUTE_BUDGET,
    },
  ];

  // Close instructions
  const closeInstructions: InstructionWithEphemeralSigners[] = [
    {
      instruction: await wormhole.methods
        .closeEncodedVaa()
        .accounts({ encodedVaa: encodedVaaKeypair.publicKey })
        .instruction(),
      signers: [],
      computeUnits: CLOSE_ENCODED_VAA_COMPUTE_BUDGET,
    },
  ];

  return {
    initInstructions,
    writeFirstPartInstructions,
    writeSecondPartAndVerifyInstructions,
    closeInstructions,
    encodedVaaAddress: encodedVaaKeypair.publicKey,
  };
}

/**
 * Build an instruction to create an encoded VAA account.
 *
 * This is the first step to post a VAA to the Wormhole program.
 */
export async function buildEncodedVaaCreateInstruction(
  wormhole: Program<WormholeCoreBridgeSolana>,
  vaa: Buffer,
  encodedVaaKeypair: Keypair
): Promise<InstructionWithEphemeralSigners> {
  const encodedVaaSize = vaa.length + VAA_START;
  return {
    instruction: await wormhole.account.encodedVaa.createInstruction(encodedVaaKeypair, encodedVaaSize),
    signers: [encodedVaaKeypair],
  };
}

/**
 * Returns the address of a guardian set account from the Wormhole program.
 */
export const getGuardianSetPda = (guardianSetIndex: number, wormholeProgramId: PublicKey) => {
  const guardianSetIndexBuf = Buffer.alloc(4);
  guardianSetIndexBuf.writeUInt32BE(guardianSetIndex, 0);
  return PublicKey.findProgramAddressSync([Buffer.from("GuardianSet"), guardianSetIndexBuf], wormholeProgramId)[0];
};

export type PriceFeedMessage = {
  feedId: Buffer;
  price: BN;
  confidence: BN;
  exponent: number;
  publishTime: BN;
  prevPublishTime: BN;
  emaPrice: BN;
  emaConf: BN;
};

export function parsePriceFeedMessage(message: Buffer): PriceFeedMessage {
  let cursor = 0;
  const variant = message.readUInt8(cursor);
  if (variant !== PRICE_FEED_MESSAGE_VARIANT) {
    throw new Error("Not a price feed message");
  }
  cursor += 1;
  const feedId = message.subarray(cursor, cursor + 32);
  cursor += 32;
  const price = new BN(message.subarray(cursor, cursor + 8), "be");
  cursor += 8;
  const confidence = new BN(message.subarray(cursor, cursor + 8), "be");
  cursor += 8;
  const exponent = message.readInt32BE(cursor);
  cursor += 4;
  const publishTime = new BN(message.subarray(cursor, cursor + 8), "be");
  cursor += 8;
  const prevPublishTime = new BN(message.subarray(cursor, cursor + 8), "be");
  cursor += 8;
  const emaPrice = new BN(message.subarray(cursor, cursor + 8), "be");
  cursor += 8;
  const emaConf = new BN(message.subarray(cursor, cursor + 8), "be");
  cursor += 8;
  return {
    feedId,
    price,
    confidence,
    exponent,
    publishTime,
    prevPublishTime,
    emaPrice,
    emaConf,
  };
}
