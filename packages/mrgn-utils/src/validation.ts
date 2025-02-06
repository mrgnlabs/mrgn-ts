import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";
import { BankMetadata } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export const containsProfanity = (text: string) => {
  return profanityMatcher.hasMatch(text);
};

export const validateAssetName = (value: string, banks: BankMetadata[]) => {
  const nameRegex = /^[a-zA-Z0-9\s]{3,24}$/;
  const bankNames = banks.map((bank) => bank.tokenName);
  if (!nameRegex.test(value)) {
    return "Name must be 3-24 characters and contain only letters, numbers, and spaces";
  }
  if (bankNames.some((name) => name.toLowerCase() === value.toLowerCase())) {
    return "Asset name already exists";
  }
  if (containsProfanity(value)) {
    return "Asset name contains profanity";
  }
  return null;
};

export const validateAssetSymbol = (value: string, banks: BankMetadata[]) => {
  const symbolRegex = /^[a-zA-Z0-9]{3,10}$/;
  const bankSymbols = banks.map((bank) => bank.tokenSymbol);
  if (!symbolRegex.test(value)) {
    return "Symbol must be 3-10 characters and contain only letters and numbers";
  }
  if (bankSymbols.some((symbol) => symbol.toLowerCase() === value.toLowerCase())) {
    return "Asset symbol already exists";
  }
  if (containsProfanity(value)) {
    return "Asset symbol contains profanity";
  }
  return null;
};

export const validateVoteAccount = (value: string, validatorPubKeys: PublicKey[]) => {
  try {
    new PublicKey(value);
    const found = validatorPubKeys.find((key) => key.toBase58().toLowerCase() === value.toLowerCase());
    return found ? "Bank already exists for this validator" : null;
  } catch (e) {
    return "Invalid vote account key";
  }
};
