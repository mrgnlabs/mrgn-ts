export type Environment = "production" | "staging";

export interface Config {
  PROGRAM_ID: string;
  GROUP_ADDRESS: string;
}

export type AccountCache = {
  timestamp: number;
  accounts: string[];
};

export type BankMetadata = {
  bankAddress: string;
  tokenSymbol: string;
};

export type BirdeyeTokenMetadataResponse = {
  data?: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logo_uri: string;
  };
};
