# Tools Package

A collection of CLI tools and utilities for account and banking operations.

## Features

- Command-line interface tools for common operations.
- Account and bank search utilities.
- Collection of debugging and testing scripts.

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
  Account public key *(string, required)*

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
  Wallet public key *(string, required)*

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
  Minimum balance to return *(number, default: 0.1)*
- `-l, --limit`  
  Maximum number of accounts to return *(number, default: 1)*

---

### `pnpm accounts:cache`

**Description:**  
Caches account data for quicker access.

**Usage:**
```bash
pnpm accounts:cache
```

**Options:**
- *No options available.*

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
  Bank public key *(string)*
- `-s, --symbol`  
  Token symbol (e.g., 'USDC') *(string)*

---

### `pnpm banks:get-all`

**Description:**  
Retrieves details for all banks.

**Usage:**
```bash
pnpm banks:get-all
```

**Options:**
- *No options available.*

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
  Bank public key *(string)*
- `-s, --symbol`  
  Token symbol (e.g., 'USDC') *(string)*
- `-l, --limit`  
  Limit the number of accounts to return *(number, default: 5)*
- `-m, --min-balance`  
  Minimum balance to return *(number, default: 0.01)*
- `-t, --type`  
  Type of accounts to return

---

## Additional Help

Run any script with the `--help` flag for more details.

**Example:**
```bash
pnpm accounts:get --help
```