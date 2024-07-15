export interface BankToken {
  token: string;
  oracleType: "Pyth" | "Switchboard";
  oracle: string;
}

export const bankTokens: BankToken[] = [
  {
    token: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", //BONK
    oracleType: "Pyth",
    oracle: "JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB",
  },
  {
    token: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", //WIF
    oracleType: "Pyth",
    oracle: "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG",
  },
];
