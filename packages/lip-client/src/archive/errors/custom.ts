export type CustomError =
  | CampaignNotActive
  | DepositAmountTooLarge
  | DepositNotMature

export class CampaignNotActive extends Error {
  static readonly code = 6000
  readonly code = 6000
  readonly name = "CampaignNotActive"
  readonly msg = "Campaign is not active"

  constructor(readonly logs?: string[]) {
    super("6000: Campaign is not active")
  }
}

export class DepositAmountTooLarge extends Error {
  static readonly code = 6001
  readonly code = 6001
  readonly name = "DepositAmountTooLarge"
  readonly msg = "Deposit amount is to large"

  constructor(readonly logs?: string[]) {
    super("6001: Deposit amount is to large")
  }
}

export class DepositNotMature extends Error {
  static readonly code = 6002
  readonly code = 6002
  readonly name = "DepositNotMature"
  readonly msg = "Deposit hasn't matured yet"

  constructor(readonly logs?: string[]) {
    super("6002: Deposit hasn't matured yet")
  }
}

export function fromCode(code: number, logs?: string[]): CustomError | null {
  switch (code) {
    case 6000:
      return new CampaignNotActive(logs)
    case 6001:
      return new DepositAmountTooLarge(logs)
    case 6002:
      return new DepositNotMature(logs)
  }

  return null
}
