import { Tool } from "langchain/tools";
import { Connection, PublicKey } from "@solana/web3.js";

import { getClient } from "../utils";
import { getAssociatedTokenAddressSync, nativeToUi, unpackAccount } from "@mrgnlabs/mrgn-common";
import BN from "bn.js";

interface TokenAccount {
  mint: PublicKey;
  created: boolean;
  balance: number;
}

type TokenAccountMap = Map<string, TokenAccount>;

class WalletBalancesTool extends Tool {
  name = "wallet-balances-tool";

  description =
    "A tool to get information about the SOL and token balances of a user. Useful when you need to answer questions and action requests related to how much the user has available to use (e.g. 'how much usdc so I have in my wallet?' or 'deposit all the bonk I have into marginfi'). The user's wallet public key is intialized in the constructor. Input should be null.";

  walletPublicKey: string;
  connection: Connection;

  constructor(walletPublicKey: string, rpcEndpoint: string) {
    super();
    this.walletPublicKey = walletPublicKey;
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  async getWalletBalances(): Promise<{
    nativeSolBalance: number;
    tokenAccounts: TokenAccount[];
  }> {
    const client = await getClient(this.connection);
    const banks = [...client.group.banks.values()];
    const wallet = new PublicKey(this.walletPublicKey);

    // Get relevant addresses
    const mintList = banks.map((bank) => ({
      address: bank.mint,
      decimals: bank.mintDecimals,
    }));

    if (wallet === null) {
      const emptyTokenAccountMap = new Map(
        mintList.map(({ address }) => [
          address.toBase58(),
          {
            created: false,
            mint: address,
            balance: 0,
          },
        ])
      );

      return {
        nativeSolBalance: 0,
        tokenAccounts: [],
      };
    }

    const ataAddresses = mintList.map((mint) => getAssociatedTokenAddressSync(mint.address, wallet!));

    // Fetch relevant accounts
    const accountsAiList = await this.connection.getMultipleAccountsInfo([wallet, ...ataAddresses]);
    console.log(accountsAiList);

    // Decode account buffers
    const [walletAi, ...ataAiList] = accountsAiList;
    const nativeSolBalance = walletAi?.lamports ? walletAi.lamports / 1e9 : 0;

    const ataList: TokenAccount[] = ataAiList.map((ai, index) => {
      if (!ai) {
        return {
          created: false,
          mint: mintList[index].address,
          balance: 0,
        };
      }
      const decoded = unpackAccount(ataAddresses[index], ai);
      return {
        created: true,
        mint: decoded.mint,
        balance: nativeToUi(new BN(decoded.amount.toString()), mintList[index].decimals),
      };
    });

    return { nativeSolBalance, tokenAccounts: ataList };
  }

  async _call(): Promise<string> {
    console.log("calling wallet balances tool");
    const walletBalances = await this.getWalletBalances();

    const response = `
      You called an Wallet tool that provides information on a specific user's native SOL and token balances.

      Here is some context on how to read the account information:
        - native SOL balance represents how much SOL the user owns in its native form. It is the only currency of its kind and is generally considered together with the user's SOL token balance, as most protocol are able to handle this duality when interacting with them (e.g. when depositing SOL), consequently considering the "SOL balance" to be the sum of the native SOL and SOL tokens.
        - tokenAccountMap is the list of the supported token accounts. It is indexed by the token mint and each value contains:
          - created: whether the user has an account for the token in question; if they don't the balance is 0
          - mint: the token mint, which can be associated to a token name through token infos
          - balance: the token balance

      Here is the user's native SOL balance: ${walletBalances.nativeSolBalance}
      Here are the user's token balances:
      ${JSON.stringify(walletBalances.tokenAccounts)}
    `;

    console.log({ response });

    return response;
  }
}

export { WalletBalancesTool };
