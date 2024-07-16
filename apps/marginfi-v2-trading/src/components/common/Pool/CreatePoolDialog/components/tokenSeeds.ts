export interface BankToken {
  token: string;
  oracleType: "Pyth" | "Switchboard";
  oracle: string;
  borrowLimit?: 200;
  depositLimit?: 10000;
}

export const bankTokens: BankToken[] = [
  {
    token: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", //BONK
    oracleType: "Pyth",
    oracle: "JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB",
    borrowLimit: 200,
    depositLimit: 10000,
  },
  {
    token: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", //WIF
    oracleType: "Pyth",
    oracle: "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG",
    borrowLimit: 200,
    depositLimit: 10000,
  },
];
