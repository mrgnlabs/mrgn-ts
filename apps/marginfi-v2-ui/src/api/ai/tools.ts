import { Connection, PublicKey } from "@solana/web3.js";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { getConfig, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { Tool } from "langchain/tools";

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

  console.log({
    banks
  })
  console.log([...banks.values()].map((bank) => `${bank.label}: ${bank.publicKey.toBase58()}`));

  return 'placeholder_string';
}

interface AccountsProps { walletPublicKey: string }

const getAccounts = async ({ walletPublicKey }: AccountsProps) => {
  const client = await getClient();
  const accounts = await client.getMarginfiAccountsForAuthority(
    new PublicKey(walletPublicKey)
  );

  console.log({ accounts });
  console.log(accounts.map((account) => account.authority.toBase58()));

  return 'placeholder_string';
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

export {
  BanksTool,
  AccountsTool
}
