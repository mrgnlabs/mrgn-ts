import { Tool } from "langchain/tools";
import { getClient } from '../utils';

const getBanks = async () => {
  const client = await getClient();
  const banks = client.group.banks;

  const resJson = [...banks.values()].map(
    (bank) => (
      {
        overview: {
          token: bank.label,
          tokenMintPubkey: bank.mint.toBase58(),
        },
        depositAndBorrowingConfigs: {
          assetWeightInitial: bank.config.assetWeightInit.toNumber(),
          assetWeightMaintenance: bank.config.assetWeightMaint.toNumber(),
          liabilityWeightInitial: bank.config.liabilityWeightInit.toNumber(),
          liabilityWeightMaintenance: bank.config.liabilityWeightMaint.toNumber(),
        },
        interestRateFeeConfigs: {
          insuranceFeeFixedApr: bank.config.interestRateConfig.insuranceFeeFixedApr.toNumber(),
          maxInterestRate: bank.config.interestRateConfig.maxInterestRate.toNumber(),
          insuranceIrFee: bank.config.interestRateConfig.insuranceIrFee.toNumber(),
          optimalUtilizationRate: bank.config.interestRateConfig.optimalUtilizationRate.toNumber(),
          plateauInterestRate: bank.config.interestRateConfig.plateauInterestRate.toNumber(),
          protocolFixedFeeApr: bank.config.interestRateConfig.protocolFixedFeeApr.toNumber(),
          protocolIrFee: bank.config.interestRateConfig.protocolIrFee.toNumber(),
        }
      }
    )
  )

  return JSON.stringify(resJson);
}

class BanksTool extends Tool {
    name = "bank-tool";
  
    description =
      "A tool to get information about marginfi token pools, which are internally called Banks. useful when you need to answer questions about the whole protocol. input should be null."
  
    constructor() {
      super();
    }
  
    async _call(): Promise<string> {
      return await getBanks();
    }
}

export { BanksTool }
