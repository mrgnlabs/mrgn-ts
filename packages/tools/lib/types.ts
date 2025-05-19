export type Environment = "production" | "staging";
import * as admin from "firebase-admin";

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

export type BirdeyePriceResponse = {
  data?: {
    [tokenAddress: string]: {
      value: number;
      updateUnixTime: number;
      updateHumanTime: string;
    };
  };
};

export type ActivityDetails = {
  amount?: string;
  symbol?: string;
  secondaryAmount?: string;
  secondarySymbol?: string;
};

export type Activity = {
  id: string;
  type: string;
  details: ActivityDetails;
  account?: string;
  timestamp: admin.firestore.Timestamp;
  txn: string;
};
