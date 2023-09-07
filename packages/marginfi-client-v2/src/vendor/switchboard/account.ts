import * as anchor from "@coral-xyz/anchor";
export class Account {
  program;
  publicKey;
  /**
   * Account constructor
   * @param program SwitchboardProgram
   * @param publicKey PublicKey of the on-chain resource
   */
  constructor(program: any, publicKey: anchor.web3.PublicKey) {
    this.program = program;
    this.publicKey = typeof publicKey === "string" ? new anchor.web3.PublicKey(publicKey) : publicKey;
  }
}
export const BUFFER_DISCRIMINATOR = Buffer.from([
  66,
  85,
  70,
  70,
  69,
  82,
  120,
  120, // BUFFERxx
]);
