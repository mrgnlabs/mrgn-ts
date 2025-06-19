# Tools Package

A collection of CLI tools and utilities for account and banking operations.

## Features

- Command-line interface tools for common operations.
- Account and bank search utilities.
- Collection of debugging and testing scripts.

## Requirements

- Node, with support for crypto. If this is false, upgrade Node versions:

```
console.log("Environment supports crypto: ", !!global.crypto?.subtle);
```

- pnpm (`npm install -g pnpm@latest-10`)
- (Optional) A wallet (with SOL) at ~/keys/wallet.json

## Create Env File

- Under packages/tools create a `.env` file.

```
PRIVATE_RPC_ENDPOINT="https://rpc.ironforge.network/mainnet?apiKey=WHATEVER"
MARGINFI_WALLET=home/user/keys/wallet.json
MARGINFI_ENV="production"
BIRDEYE_API_KEY=<API_KEY>
```

## Available Tools

### `pnpm accounts:get`

**Description:**  
Retrieves account details by providing the account public key.

**Usage:**

```bash
pnpm accounts:get --account <ACCOUNT_PUBLIC_KEY>
```

**Options:**

- `-a, --account`  
  Account public key _(string, required)_

---

### `pnpm accounts:get-all`

**Description:**  
Retrieves details for all accounts associated with a wallet.

**Usage:**

```bash
pnpm accounts:get-all --wallet <WALLET_PUBLIC_KEY>
```

**Options:**

- `-w, --wallet`  
  Wallet public key _(string, required)_

---

### `pnpm accounts:find-users`

**Description:**  
Searches for users based on assets, liabilities, and balance criteria.

**Usage:**

```bash
pnpm accounts:find-users [options]
```

**Options:**

- `--assets`  
  Comma-separated list of token symbols to search for assets.
- `--liabs`  
  Comma-separated list of token symbols to search for liabilities.
- `-m, --min-balance`  
  Minimum balance to return _(number, default: 0.1)_
- `-l, --limit`  
  Maximum number of accounts to return _(number, default: 1)_

---

### `pnpm accounts:cache`

**Description:**  
Caches account data for quicker access.

**Usage:**

```bash
pnpm accounts:cache
```

**Options:**

- _No options available._

---

### `pnpm banks:get`

**Description:**  
Retrieves bank details using either the bank's public key or a token symbol.

**Usage:**

```bash
pnpm banks:get [options]
```

**Options:**

- `-a, --address`  
  Bank public key _(string)_
- `-s, --symbol`  
  Token symbol (e.g., 'USDC') _(string)_

---

### `pnpm banks:get-all`

**Description:**  
Retrieves details for all banks.

**Usage:**

```bash
pnpm banks:get-all
```

**Options:**

- _No options available._

---

### `pnpm banks:get-accounts`

**Description:**  
Retrieves accounts associated with a specific bank.

**Usage:**

```bash
pnpm banks:get-accounts [options]
```

**Options:**

- `-a, --address`  
  Bank public key _(string)_
- `-s, --symbol`  
  Token symbol (e.g., 'USDC') _(string)_
- `-l, --limit`  
  Limit the number of accounts to return _(number, default: 5)_
- `-m, --min-balance`  
  Minimum balance to return _(number, default: 0.01)_
- `-t, --type`  
  Type of accounts to return

---

## Additional Help

Run any script with the `--help` flag for more details.

**Example:**

```bash
pnpm accounts:get --help
```
