import { OpenAI } from "langchain";
import { initializeAgentExecutor } from "langchain/agents";
import { Tool } from "langchain/tools";

import { Connection, PublicKey } from "@solana/web3.js";
import { NodeWallet, nativeToUi } from "@mrgnlabs/mrgn-common";
import { getConfig, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

// ===================
// [Start] Helpers
// ===================

const getClient = async () => {
  const connection = new Connection(process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || 'https://mrgn.rpcpool.com', "confirmed");
  const wallet = NodeWallet.local();
  const config = await getConfig("production");
  const client = await MarginfiClient.fetch(config, wallet, connection);

  return client
}

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

interface AccountsProps { walletPublicKey: string }

const getAccounts = async ({ walletPublicKey }: AccountsProps) => {
  const client = await getClient();
  const accounts = await client.getMarginfiAccountsForAuthority(
    new PublicKey(walletPublicKey)
  );
  const account = accounts[0]

  const resJson = account.activeBalances.map(
    (balance) => {

      const bank = client.group.banks.get(balance.bankPk.toBase58());

      if (bank) {
        return {
          token: balance.bankPk.toBase58(),
          lending: nativeToUi(balance.assetShares, bank.mintDecimals),
          borrowing: nativeToUi(balance.liabilityShares, bank.mintDecimals),
        }
      } else {
        return {}
      }
    }
  )

  return JSON.stringify(resJson)
}

// ===================
// [End] Helpers
// ===================

// ===================
// [Start] Tools
// ===================

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

class AccountsTool extends Tool {
  name = "accounts-tool";

  description =
    "A tool to get information about a user's marginfi acocunt. useful when you need to answer questions about a user's portfolio, specific positions, health ratio, etc. input should be a wallet public key string."

  constructor() {
    super();
  }

  async _call(input: string): Promise<string> {
    return await getAccounts({ walletPublicKey: input });
  }
}

// ===================
// [End] Tools
// ===================

// ===================
// [Start] Agent Executor
// ===================

const getAgentExecutor = async () => {
  const model = new OpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, temperature: 1 });
  const tools = [new BanksTool(), new AccountsTool()];

  const executor = await initializeAgentExecutor(
    tools,
    model,
    "zero-shot-react-description"
  );

  return executor;
}

// ===================
// [End] Agent Executor
// ===================

const callAI = async (input: string) => {
  const executor = await getAgentExecutor();
  const output = await executor.call({ input })

  return output;
}

export { 
  getClient,
  getAccounts,
  callAI 
};
