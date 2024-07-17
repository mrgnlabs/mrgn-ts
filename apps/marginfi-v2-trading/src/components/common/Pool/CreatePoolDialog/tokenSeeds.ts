import { OracleSetup } from "@mrgnlabs/marginfi-client-v2";

export interface BankToken {
  tag: string;
  token: string;
  oracleType: OracleSetup;
  oracle: string;
  borrowLimit?: number;
  depositLimit?: number;
}

export const bankTokens: BankToken[] = [
  {
    tag: "BONK",
    token: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", //BONK
    oracleType: OracleSetup.PythEma,
    oracle: "JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB",
    borrowLimit: 200,
    depositLimit: 10000,
  },
  {
    tag: "WIF",
    token: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", //WIF
    oracleType: OracleSetup.PythEma,
    oracle: "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG",
    borrowLimit: 200,
    depositLimit: 10000,
  },
];
