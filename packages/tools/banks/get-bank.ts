import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { getDefaultYargsOptions, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";
import {
  formatNumber,
  getPythPushOracleAddresses,
  getBankMetadata,
  getBankMetadataFromBirdeye,
  getBankPrices,
} from "../lib/utils";

dotenv.config();

type BankMetadata = {
  bankAddress: string;
  tokenSymbol: string;
};

async function main() {
  const argv = getDefaultYargsOptions()
    .option("address", {
      alias: "a",
      type: "string",
      description: "Bank public key",
    })
    .option("symbol", {
      alias: "s",
      type: "string",
      description: "Token symbol (e.g., 'USDC')",
    })
    .check((argv) => {
      if (!argv.address && !argv.symbol) {
        throw new Error("Either --address or --symbol must be provided");
      }
      if (argv.address && argv.symbol) {
        throw new Error("Please provide either --address or --symbol, not both");
      }
      return true;
    })
    .parseSync();

  const program = getMarginfiProgram(argv.env as Environment);
  const bankMetadata = await getBankMetadata(argv.env as Environment);

  let bankPubkey: PublicKey;
  if (argv.address) {
    bankPubkey = new PublicKey(argv.address);
  } else {
    const bankMeta = bankMetadata.find((meta) => meta.tokenSymbol.toLowerCase() === argv.symbol.toLowerCase());
    if (!bankMeta) {
      throw new Error(`No bank found for symbol: ${argv.symbol}`);
    }
    bankPubkey = new PublicKey(bankMeta.bankAddress);
  }

  const acc = await program.account.bank.fetch(bankPubkey);
  let bankMeta = bankMetadata.find((meta) => meta.bankAddress === bankPubkey.toString());

  if (!bankMeta) {
    bankMeta = await getBankMetadataFromBirdeye(bankPubkey, acc.mint);
  }

  const priceMap = await getBankPrices([acc]);
  const price = priceMap.get(acc.mint.toString());

  const assetWeightInit = wrappedI80F48toBigNumber(acc.config.assetWeightInit);
  const assetWeightMaint = wrappedI80F48toBigNumber(acc.config.assetWeightMaint);
  const liabilityWeightInit = wrappedI80F48toBigNumber(acc.config.liabilityWeightInit);
  const liabilityWeightMaint = wrappedI80F48toBigNumber(acc.config.liabilityWeightMaint);

  const totalAssetShares = wrappedI80F48toBigNumber(acc.totalAssetShares);
  const totalLiabilityShares = wrappedI80F48toBigNumber(acc.totalLiabilityShares);
  const assetShareValue = wrappedI80F48toBigNumber(acc.assetShareValue);
  const liabilityShareValue = wrappedI80F48toBigNumber(acc.liabilityShareValue);

  const insuranceIrFee = wrappedI80F48toBigNumber(acc.config.interestRateConfig.insuranceIrFee);
  const insiranceFixedFee = wrappedI80F48toBigNumber(acc.config.interestRateConfig.insuranceFeeFixedApr);
  const protocolIrFee = wrappedI80F48toBigNumber(acc.config.interestRateConfig.protocolIrFee);
  const protocolFixedFee = wrappedI80F48toBigNumber(acc.config.interestRateConfig.protocolFixedFeeApr);
  const originationFee = wrappedI80F48toBigNumber(acc.config.interestRateConfig.protocolOriginationFee);
  const maxInterestRate = wrappedI80F48toBigNumber(acc.config.interestRateConfig.maxInterestRate);
  const plateauInterestRate = wrappedI80F48toBigNumber(acc.config.interestRateConfig.plateauInterestRate);
  const optimalUtilizationRate = wrappedI80F48toBigNumber(acc.config.interestRateConfig.optimalUtilizationRate);
  const scaleFactor = Math.pow(10, acc.mintDecimals);
  const totalAssetQuantity = totalAssetShares.times(assetShareValue).div(scaleFactor);
  const totalLiabilityQuantity = totalLiabilityShares.times(liabilityShareValue).div(scaleFactor);

  const oracleType = acc.config.oracleSetup.pythPushOracle !== undefined ? "Pyth" : "Switchboard";
  const oracleKeys = acc.config.oracleKeys.filter((key) => !key.equals(PublicKey.default));
  const pythOracleAddresses = oracleKeys.map((key) => getPythPushOracleAddresses(key.toBuffer()));

  const eModeConfig = acc.emode;

  const eModeTag = eModeConfig.emodeTag;
  const eModeTimestamp = new Date(eModeConfig.timestamp.toNumber() * 1000).toLocaleString("en-US");
  const eModeFlags = eModeConfig.flags.toString();
  const eModeEntries = eModeConfig.emodeConfig.entries
    .filter((entry) => entry.collateralBankEmodeTag !== 0)
    .map((entry) => {
      return {
        collateralBankEmodeTag: entry.collateralBankEmodeTag,
        assetWeightInit: wrappedI80F48toBigNumber(entry.assetWeightInit),
        assetWeightMaint: wrappedI80F48toBigNumber(entry.assetWeightMaint),
        flags: entry.flags,
      };
    });

  const bankData = {
    Address: bankPubkey.toString(),
    Group: acc.group.toString(),
    Mint: acc.mint.toString(),
    Symbol: bankMeta?.tokenSymbol,
    Decimals: acc.mintDecimals,
    Price: `$${formatNumber(Number(price))}`,
    "Oracle Type": oracleType,
    "Oracle Keys": oracleKeys.join(", "),
    ...(oracleType === "Pyth" ? { "Pyth Oracle Addresses": pythOracleAddresses.join(", ") } : {}),
    "Bank Type": acc.config.assetTag === 2 ? "Native Stake" : acc.config.riskTier.collateral ? "Global" : "Isolated",
    Flags: acc.flags.toNumber(),
    "Asset Weight Init": assetWeightInit.toNumber(),
    "Asset Weight Maint": assetWeightMaint.toNumber(),
    "Liability Weight Init": liabilityWeightInit.toNumber(),
    "Liability Weight Maint": liabilityWeightMaint.toNumber(),
    "Insurance IR Fee": insuranceIrFee.toNumber(),
    "Insurance Fixed Fee": insiranceFixedFee.toNumber(),
    "Protocol IR Fee": protocolIrFee.toNumber(),
    "Protocol Fixed Fee": protocolFixedFee.toNumber(),
    "Origination Fee": originationFee.toNumber(),
    "Max Interest Rate": maxInterestRate.toNumber(),
    "Plateau Interest Rate": plateauInterestRate.toNumber(),
    "Optimal Utilization Rate": optimalUtilizationRate.toNumber(),
    "Asset Share Value": assetShareValue.toNumber(),
    "Liability Share Value": liabilityShareValue.toNumber(),
    "Asset Quantity": formatNumber(totalAssetQuantity),
    "Asset Value (USD)": `$${formatNumber(totalAssetQuantity.times(price))}`,
    "Liability Quantity": formatNumber(totalLiabilityQuantity),
    "Liability Value (USD)": `$${formatNumber(totalLiabilityQuantity.times(price))}`,
    "EMode Tag": eModeTag,
    "EMode Timestamp": eModeTimestamp,
    "EMode Flags": eModeFlags,
    "EMode Entries": JSON.stringify(eModeEntries),
  };

  console.log(`\r\nBank: ${bankPubkey.toString()}`);
  console.table(bankData);
}

main().catch((err) => {
  console.error(err);
});
