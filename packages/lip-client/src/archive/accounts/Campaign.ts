import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface CampaignFields {
  admin: PublicKey
  lockupPeriod: BN
  active: boolean
  maxDeposits: BN
  remainingCapacity: BN
  maxRewards: BN
  marginfiBankPk: PublicKey
  padding: Array<BN>
}

export interface CampaignJSON {
  admin: string
  lockupPeriod: string
  active: boolean
  maxDeposits: string
  remainingCapacity: string
  maxRewards: string
  marginfiBankPk: string
  padding: Array<string>
}

export class Campaign {
  readonly admin: PublicKey
  readonly lockupPeriod: BN
  readonly active: boolean
  readonly maxDeposits: BN
  readonly remainingCapacity: BN
  readonly maxRewards: BN
  readonly marginfiBankPk: PublicKey
  readonly padding: Array<BN>

  static readonly discriminator = Buffer.from([
    50, 40, 49, 11, 157, 220, 229, 192,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("admin"),
    borsh.u64("lockupPeriod"),
    borsh.bool("active"),
    borsh.u64("maxDeposits"),
    borsh.u64("remainingCapacity"),
    borsh.u64("maxRewards"),
    borsh.publicKey("marginfiBankPk"),
    borsh.array(borsh.u64(), 16, "padding"),
  ])

  constructor(fields: CampaignFields) {
    this.admin = fields.admin
    this.lockupPeriod = fields.lockupPeriod
    this.active = fields.active
    this.maxDeposits = fields.maxDeposits
    this.remainingCapacity = fields.remainingCapacity
    this.maxRewards = fields.maxRewards
    this.marginfiBankPk = fields.marginfiBankPk
    this.padding = fields.padding
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<Campaign | null> {
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
  ): Promise<Array<Campaign | null>> {
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

  static decode(data: Buffer): Campaign {
    if (!data.slice(0, 8).equals(Campaign.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = Campaign.layout.decode(data.slice(8))

    return new Campaign({
      admin: dec.admin,
      lockupPeriod: dec.lockupPeriod,
      active: dec.active,
      maxDeposits: dec.maxDeposits,
      remainingCapacity: dec.remainingCapacity,
      maxRewards: dec.maxRewards,
      marginfiBankPk: dec.marginfiBankPk,
      padding: dec.padding,
    })
  }

  toJSON(): CampaignJSON {
    return {
      admin: this.admin.toString(),
      lockupPeriod: this.lockupPeriod.toString(),
      active: this.active,
      maxDeposits: this.maxDeposits.toString(),
      remainingCapacity: this.remainingCapacity.toString(),
      maxRewards: this.maxRewards.toString(),
      marginfiBankPk: this.marginfiBankPk.toString(),
      padding: this.padding.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: CampaignJSON): Campaign {
    return new Campaign({
      admin: new PublicKey(obj.admin),
      lockupPeriod: new BN(obj.lockupPeriod),
      active: obj.active,
      maxDeposits: new BN(obj.maxDeposits),
      remainingCapacity: new BN(obj.remainingCapacity),
      maxRewards: new BN(obj.maxRewards),
      marginfiBankPk: new PublicKey(obj.marginfiBankPk),
      padding: obj.padding.map((item) => new BN(item)),
    })
  }
}
