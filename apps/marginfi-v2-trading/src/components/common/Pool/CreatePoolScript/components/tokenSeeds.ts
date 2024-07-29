import { OracleSetup } from "@mrgnlabs/marginfi-client-v2";

export interface BankToken {
  tag: string;
  token: string;
  oracleType: OracleSetup;
  oracle: string;
  group: string;
  tokenBank: string;
  usdcBank: string;
  borrowLimit?: number;
  depositLimit?: number;
}

export const bankTokens: BankToken[] = [
  // {
  //   tag: "POPCAT",
  //   token: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
  //   oracleType: OracleSetup.SwitchboardV2,
  //   oracle: "8d45nFEBUrKAJpeRt5AND5enwP1Tq26dz6nvpNPAGBZd",
  //   borrowLimit: 32463,
  //   depositLimit: 129065,
  // },
  //   Mint:  CTJf74cTo3cw8acFP1YXF3QpsQUUBGBjh2k2e8xsZ6UL
  // Group: 66btxK2CRD4wjyQ7ec4yFrmAnsvFY3YvJNHSJ1evHH43
  // Token: AKEg31GR9rDD36Px5iwJpseve9FD34pGiSUgNqnri7Tw
  // USDC: 5tAgDoSxJBW995stfnvphtquP8JHn11xD3V3FvtLpxNQ
  // Mint: CTg3ZgYx79zrE1MteDVkmkcGniiFrK1hJ6yiabropump
  // Group: FXA3RRXZyujyaz1wWWnyxmgJ91SG8NVderuTgnSfeFUw
  // Token: CFyznshAA978t6HCm4xprQpnN62c2qFSQrsCWN8q5UDB
  // USDC: 6YAVn7cEwiKBPiCXMFVY9cv5oWRj56WuPhNFjJyXWFad
  {
    tag: "TOKEN_1",
    token: "CTJf74cTo3cw8acFP1YXF3QpsQUUBGBjh2k2e8xsZ6UL",
    oracleType: OracleSetup.SwitchboardV2,
    oracle: "FMtGWfzCAQiacGNuBFPs4AwtJFk3SYj6CnMTax9mXJvh",
    group: "66btxK2CRD4wjyQ7ec4yFrmAnsvFY3YvJNHSJ1evHH43",
    tokenBank: "AKEg31GR9rDD36Px5iwJpseve9FD34pGiSUgNqnri7Tw",
    usdcBank: "5tAgDoSxJBW995stfnvphtquP8JHn11xD3V3FvtLpxNQ",
  },
  {
    tag: "TOKEN_2",
    token: "CTg3ZgYx79zrE1MteDVkmkcGniiFrK1hJ6yiabropump",
    oracleType: OracleSetup.SwitchboardV2,
    oracle: "EYfBmSdcwKXmGhcjAj9ruvesAH4F82dHFT7w7TZEjFoM",
    group: "FXA3RRXZyujyaz1wWWnyxmgJ91SG8NVderuTgnSfeFUw",
    tokenBank: "CFyznshAA978t6HCm4xprQpnN62c2qFSQrsCWN8q5UDB",
    usdcBank: "6YAVn7cEwiKBPiCXMFVY9cv5oWRj56WuPhNFjJyXWFad",
  },
];
