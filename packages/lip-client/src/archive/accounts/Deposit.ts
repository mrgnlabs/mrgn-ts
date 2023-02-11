import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface DepositFields {
  owner: PublicKey
  amount: BN
  startTime: BN
  campaign: PublicKey
  padding: Array<BN>
}

export interface DepositJSON {
  owner: string
  amount: string
  startTime: string
  campaign: string
  padding: Array<string>
}

export class Deposit {
  readonly owner: PublicKey
  readonly amount: BN
  readonly startTime: BN
  readonly campaign: PublicKey
  readonly padding: Array<BN>

  static readonly discriminator = Buffer.from([
    148, 146, 121, 66, 207, 173, 21, 227,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("owner"),
    borsh.u64("amount"),
    borsh.i64("startTime"),
    borsh.publicKey("campaign"),
    borsh.array(borsh.u64(), 16, "padding"),
  ])

  constructor(fields: DepositFields) {
    this.owner = fields.owner
    this.amount = fields.amount
    this.startTime = fields.startTime
    this.campaign = fields.campaign
    this.padding = fields.padding
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<Deposit | null> {
    const info = await c.getAccountInfo(address)

    if (info === null) {
      return null
    }
    if (!info.owner.equals(PROGRAM_ID)) {
      throw new Error("account doesn't belong to this program")
    }

    return this.decode(info.data)
  }

  static async fetchMultiple(
    c: Connection,
    addresses: PublicKey[]
  ): Promise<Array<Deposit | null>> {
    const infos = await c.getMultipleAccountsInfo(addresses)

    return infos.map((info) => {
      if (info === null) {
        return null
      }
      if (!info.owner.equals(PROGRAM_ID)) {
        throw new Error("account doesn't belong to this program")
      }

      return this.decode(info.data)
    })
  }

  static decode(data: Buffer): Deposit {
    if (!data.slice(0, 8).equals(Deposit.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = Deposit.layout.decode(data.slice(8))

    return new Deposit({
      owner: dec.owner,
      amount: dec.amount,
      startTime: dec.startTime,
      campaign: dec.campaign,
      padding: dec.padding,
    })
  }

  toJSON(): DepositJSON {
    return {
      owner: this.owner.toString(),
      amount: this.amount.toString(),
      startTime: this.startTime.toString(),
      campaign: this.campaign.toString(),
      padding: this.padding.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: DepositJSON): Deposit {
    return new Deposit({
      owner: new PublicKey(obj.owner),
      amount: new BN(obj.amount),
      startTime: new BN(obj.startTime),
      campaign: new PublicKey(obj.campaign),
      padding: obj.padding.map((item) => new BN(item)),
    })
  }
}
