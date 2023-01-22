import { PublicKey } from "@solana/web3.js";
import { Balance } from "../account";
import Bank from "../bank";
import { computeNetApr } from "./accounting";

const mockBanks = [
  new Bank("bank1", PublicKey.unique(), {} as any, {} as any),
  new Bank("bank2", PublicKey.unique(), {} as any, {} as any),
  new Bank("bank3", PublicKey.unique(), {} as any, {} as any),
];
const mockBanksMap = new Map<string, Bank>(mockBanks.map((b) => [b.label, b]));

describe("accounting", () => {
  test("all empty", () => {
    expect(
      computeNetApr(
        mockBanks.map((b) => Balance.newEmpty(b.publicKey)),
        mockBanksMap
      )
    ).toBe(0);
  });
});
