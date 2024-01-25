import { nativeToUi, numeralFormatter, percentFormatterDyn } from "@mrgnlabs/mrgn-common";
import { getMarginfiClient } from "./utils";
import { Bank, MarginfiClient } from "../src";
import { PublicKey } from "@solana/web3.js";
import { Metadata, PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

async function main() {
  const client = await getMarginfiClient();

  const sortedBanks = sortByTvl(client, client.banks);
  for (const [bankAddress, bank] of sortedBanks) {
    displayBankParameters(bankAddress, bank, client);
  }
}

function sortByTvl(client: MarginfiClient, banks: Map<string, Bank>) {
  const banksArray = Array.from(banks.entries());
  banksArray.sort(([addr1, b1], [addr2, b2]) => {
    const oraclePrice1 = client.getOraclePriceByBank(addr1);
    if (!oraclePrice1) {
      throw new Error("No oracle price");
    }
    const oraclePrice2 = client.getOraclePriceByBank(addr2);
    if (!oraclePrice2) {
      throw new Error("No oracle price");
    }
    const bankTvl1 = b1.computeTvl(oraclePrice1);
    const bankTvl2 = b2.computeTvl(oraclePrice2);

    return bankTvl2.minus(bankTvl1).toNumber();
  });
  return banksArray;
}

async function displayBankParameters(bankAddress: string, bank: Bank, client: MarginfiClient) {
  const tokenSymbol = bank.tokenSymbol;

  const riskTier = bank.config.riskTier;

  const status = bank.config.operationalState;

  const tvl = bank.computeTvl(client.getOraclePriceByBank(bankAddress)!);

  // oracle
  const oracleType = bank.config.oracleSetup;
  const oracleAddresses = bank.config.oracleKeys.filter((k) => !k.equals(PublicKey.default));

  // weights
  const assetWeightInitial = bank.config.assetWeightInit;
  const assetWeightMaintenance = bank.config.assetWeightMaint;
  const liabilityWeightInitial = bank.config.liabilityWeightInit;
  const liabilityWeightMaintenance = bank.config.liabilityWeightMaint;

  // limits
  const depositCap = bank.config.depositLimit;
  const borrowCap = bank.config.borrowLimit;
  const totalAssetValueInitLimit = bank.config.totalAssetValueInitLimit;

  // fees
  const insuranceFeeFixedApr = bank.config.interestRateConfig.insuranceFeeFixedApr;
  const insuranceIrFee = bank.config.interestRateConfig.insuranceIrFee;
  const protocolFixedFeeApr = bank.config.interestRateConfig.protocolFixedFeeApr;
  const protocolIrFee = bank.config.interestRateConfig.protocolIrFee;

  // interest curve
  const optimalUtilizationRate = bank.config.interestRateConfig.optimalUtilizationRate;
  const plateauInterestRate = bank.config.interestRateConfig.plateauInterestRate;
  const maxInterestRate = bank.config.interestRateConfig.maxInterestRate;

  // emissions
  const hasLendingEmissions = bank.emissionsActiveLending;
  const hasBorrowingEmissions = bank.emissionsActiveBorrowing;
  let emissionsMint: PublicKey | undefined;
  let emmissionsMintSymbol: string | undefined;
  let emmissionsRate: number | undefined;
  if (hasLendingEmissions || hasBorrowingEmissions) {
    const mintInfo = await client.provider.connection.getParsedAccountInfo(new PublicKey(bank.emissionsMint));
    //@ts-ignore
    const missionsMintDecimals = mintInfo.value?.data.parsed.info.decimals as number;
    emmissionsRate = bank.emissionsRate / Math.pow(10, missionsMintDecimals);
    emissionsMint = bank.emissionsMint;
    
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        emissionsMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const metadataAccountInfo = await client.provider.connection.getAccountInfo(metadataPDA);
    const metadata = Metadata.deserialize(metadataAccountInfo!.data, 0);
    //@ts-ignore
    emmissionsMintSymbol = metadata[0].data.symbol;
  }

  console.log(`------------------------------------------------`);
  console.log(`General`);
  console.log(` - Token: ${tokenSymbol}`);
  console.log(` - Bank address: ${bankAddress}`);
  console.log(` - TVL: ${numeralFormatter(tvl.toNumber())}`);
  console.log(` - Risk tier: ${riskTier}`);
  console.log(` - Status: ${status}`);
  console.log("Oracle");
  console.log(` - Type: ${oracleType}`);
  console.log(` - Addresses: ${oracleAddresses}`);
  console.log("Weights");
  console.log(` - Asset weight initial: ${percentFormatterDyn.format(assetWeightInitial.toNumber())}`);
  console.log(` - Asset weight maintenance: ${percentFormatterDyn.format(assetWeightMaintenance.toNumber())}`);
  console.log(` - Liability weight initial: ${percentFormatterDyn.format(liabilityWeightInitial.toNumber())}`);
  console.log(` - Liability weight maintenance: ${percentFormatterDyn.format(liabilityWeightMaintenance.toNumber())}`);
  console.log("Limits");
  console.log(` - Deposit cap: ${numeralFormatter(nativeToUi(depositCap, bank.mintDecimals))}`);
  console.log(` - Borrow cap: ${numeralFormatter(nativeToUi(borrowCap, bank.mintDecimals))}`);
  console.log(` - Total asset value init limit: ${numeralFormatter(totalAssetValueInitLimit.toNumber())}`);
  console.log("Fees");
  console.log(` - Insurance fee fixed APR: ${percentFormatterDyn.format(insuranceFeeFixedApr.toNumber())}`);
  console.log(` - Insurance IR fee: ${percentFormatterDyn.format(insuranceIrFee.toNumber())}`);
  console.log(` - Protocol fixed fee APR: ${percentFormatterDyn.format(protocolFixedFeeApr.toNumber())}`);
  console.log(` - Protocol IR fee: ${percentFormatterDyn.format(protocolIrFee.toNumber())}`);
  console.log("Interest curve");
  console.log(` - Optimal utilization rate: ${percentFormatterDyn.format(optimalUtilizationRate.toNumber())}`);
  console.log(` - Plateau interest rate: ${percentFormatterDyn.format(plateauInterestRate.toNumber())}`);
  console.log(` - Max interest rate: ${percentFormatterDyn.format(maxInterestRate.toNumber())}`);
  console.log("Emissions");
  console.log(` - Has lending emissions: ${hasLendingEmissions}`);
  console.log(` - Has borrowing emissions: ${hasBorrowingEmissions}`);
  if (emissionsMint) {
    console.log(` - Emissions mint: ${emissionsMint}`);
  }
  if (emmissionsRate && emmissionsMintSymbol) {
    console.log(` - Emissions rate: ${emmissionsRate} ${emmissionsMintSymbol} per ${tokenSymbol} ${hasLendingEmissions ? "lent" : "borrows"} per year`);
  }
  console.log(`\n`);
}

main();
