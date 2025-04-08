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

export type BirdeyeTokenMetadata = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo_uri: string;
};

export type BirdeyeMetadataMap = {
  [key: string]: BirdeyeTokenMetadata;
};

export type BirdeyeMetadataResponse = {
  data: BirdeyeMetadataMap;
};

export type BirdeyePrice = {
  value: number;
  updateUnixTime: number;
  updateHumanTime: string;
  priceInNative: number;
  priceChange24h: number;
  liquidity: number;
};

export type BirdeyePriceMap = {
  [key: string]: BirdeyePrice;
};

export type BirdeyePricesResponse = {
  data: BirdeyePriceMap;
};

// Define the return type for the utility function
export type BirdeyeData = {
  metadata: BirdeyeMetadataMap;
  price: BirdeyePriceMap;
};
