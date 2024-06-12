# marginfi-client-v2: A TypeScript SDK

## Getting Started

### Step 1: Initialize the marginfi client

> This example uses @solana/web3.js version 1.91.8

In order to interact with the marginfi SDK, we must first configure the marginfi client object using the `MarginfiClient` instance:

```javascript
import { Connection } from "@solana/web3.js";
import { MarginfiClient, getConfig } from '@mrgnlabs/marginfi-client-v2';
import { NodeWallet } from "@mrgnlabs/mrgn-common";

const connection = new Connection(CLUSTER_CONNECTION, "confirmed");
const wallet = NodeWallet.local();
const config = getConfig("dev");
const client = await MarginfiClient.fetch(config, wallet, connection);
```

- `connection` establishes a connection to a Solana cluster
- `wallet` creates an Anchor-compliant Node.js wallet from your [local Solana keypair](https://docs.solanalabs.com/cli/wallets/)
- `config` returns a configuration object specific to the specified environment (e.g. “production”, “development”)
- `client` is a high-level SDK for interacting with the Marginfi protocol

### Step 2: Create an Account

Accounts on marginfi are the entry point for interacting with the protocol, allowing users to deposit assets, take out loans, and manage their positions. Using the marginfi SDK, you can create an account with one line of code. With this ability, you can enable seamless user onboarding by creating dedicated accounts for each new user. 

```javascript
const marginfiAccount = await client.createMarginfiAccount();
```

### Step 3: Fetch a Bank

In order to interact with asset pools, or “banks,” on marginfi, you must first fetch the specific bank you want to borrow/lend from:

```javascript
const bankLabel = "SOL";
const bank = client.getBankByTokenSymbol(bankLabel);
if (!bank) throw Error(`${bankLabel} bank not found`);
```

- `bankLabel` holds the symbol for the bank that you will fetch. Note that you can also query banks by the token mint address (using `getBankByMint`) or by the bank address (using `getBankByPk`).
- `bank1` fetches the specified bank using `getBankByTokenSymbol`, using the bank’s token symbol “SOL” as the query parameter.

### Step 4: Make a Deposit

Once you’ve fetched the bank you want to interact with, you can make a deposit:

```javascript
await marginfiAccount.deposit(1, bank.address);
```

The `deposit` method on the marginfi account object allows you to  make a deposit into the specified bank account using the bank's address as a parameter (second parameter). Note that the first parameter let’s you specify how much (in the denominated asset) you want to deposit into the bank.

### Step 5: Borrow From a Bank

After lending liquidity on marginfi, you’re account is eligible to act as a Borrower. You can borrow liquidity from marginfi banks using one line of code:

```javascript
await marginfiAccount.borrow(1, bank.address);
```

The structure of the `borrow` method is identical to the `deposit` method. You specify the amount you want to borrow using the first parameter, and you specify which bank you want to interact with using the second parameter.

if you followed along with these steps, you just want through the full lending-and-borrowing lifecycle on marginfi. To execute your node, simply tun `ts-node <file-path>` in your terminal. You’re code should look like this:

```javascript
import { Connection } from "@solana/web3.js";
import { MarginfiClient, getConfig } from '@mrgnlabs/marginfi-client-v2';
import { NodeWallet } from "@mrgnlabs/mrgn-common";

const CLUSTER_CONNECTION = <your-rpc-url>;

const main = async () => {
	const connection = new Connection(CLUSTER_CONNECTION, "confirmed");
	const wallet = NodeWallet.local();
	const config = getConfig("dev");
	const client = await MarginfiClient.fetch(config, wallet, connection); // initialize client
	
	const marginfiAccount = await client.createMarginfiAccount(); // create an account
	
	const bankLabel = "SOL";
	const bank = client.getBankByTokenSymbol(bankLabel);
	if (!bank) throw Error(`${bankLabel} bank not found`); // fetch a bank
	
	await marginfiAccount.deposit(1, bank.address); // make a deposit
	await marginfiAccount.borrow(1, bank.address); // borrow from a bank
};

main();
```

You’re now a mrgn mama! For more details on the marginfi SDK and use cases, refer to the sections below.

---

To learn more, reference the TypeScript SDK documentation in the marginfi docs website! For dedicated support in integrating the SDK into your app, reach out to marginfi's Lead Developer Relations Engineer on Telegram @nathanzebedee. Happy hacking!