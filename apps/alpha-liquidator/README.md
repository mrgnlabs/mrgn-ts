# marginfi alpha liquidator

> This bot structure is based on the Jupiter quote API, check it out [here](https://github.com/jup-ag/jupiter-quote-api)

## Setup

Before running the alpha liquidator bot, ensure that you have the following prerequisites installed:

- Node.js (v14 or higher)
- Yarn package manager

Then, in the root of the mrgn-ts repo, install the dependencies and build the project by running:

```sh
yarn
yarn build
```

Make sure to configure the environment variables as described in the [Alpha Liquidator Configuration](#alpha-liquidator-configuration) section.

## **⚠⚠️️⚠️ IMPORTANT ⚠️⚠️⚠️**

The liquidator operates with SOL and token accounts in the provided wallet. This means it will convert non-USDC tokens (including excess SOL) to USDC and deposit the USDC into Marginfi to be used for liquidations.

## How to run

1. `./scripts/start.sh`

## Alpha Liquidator Configuration

The Alpha Liquidator application uses an environment configuration schema to manage its settings. This configuration is defined in `apps/alpha-liquidator/src/config.ts` and uses the `zod` library for schema definition and validation.

### Configuration Schema

Below are the environment variables used by the application, along with their expected types and default values:

- `RPC_ENDPOINT`: The RPC endpoint URL as a string.

- `LIQUIDATOR_PK`: The public key of the liquidator. It is a string that gets converted into a `PublicKey` object.

- `WALLET_KEYPAIR`: The wallet keypair for the liquidator. It is a string that either gets loaded from a file if it exists or gets converted from a JSON string into a `Keypair` object.

- `MIN_LIQUIDATION_AMOUNT_USD_UI`: The minimum liquidation amount in USD. It is a string that gets converted into a `BigNumber` object. Default is `"0.1"`.

- `MAX_SLIPPAGE_BPS`: The maximum slippage in basis points. It is a string that gets parsed into an integer. Default is `"250"`.

- `MIN_SOL_BALANCE`: The minimum balance of SOL required. It is a number with a default value of `0.5`.

- `ACCOUNT_COOL_DOWN_SECONDS`: The cool down period in seconds before reattempting a liquidation on an account that previously failed when using the SORT_ACCOUNTS_MODE. It is a string that gets parsed into an integer. Default is `"120"`.

- `SLEEP_INTERVAL`: The interval in milliseconds between checks. It is a string that gets parsed into an integer. Default is `"10000"`.

- `SENTRY`: A flag indicating whether Sentry is enabled for error logging. It accepts a string and converts it to a boolean. Default is `"false"`.

- `SENTRY_DSN`: The Sentry DSN string for error reporting. This field is optional.

- `SORT_ACCOUNTS_MODE`: An experimental feature flag indicating whether accounts should be sorted by the liquidation amount, with accounts having more to liquidate being prioritized. It accepts a string and converts it to a boolean. Default is `"false"`.

- `EXCLUDE_ISOLATED_BANKS`: A flag indicating whether isolated banks should be excluded from liquidation. It accepts a string and converts it to a boolean. Default is `"false"`.

- `MARGINFI_ACCOUNT_BLACKLIST`: A comma-separated string of MarginFi account public keys to be blacklisted. It gets transformed into an array of `PublicKey` objects. This field is optional.

- `MARGINFI_ACCOUNT_WHITELIST`: A comma-separated string of MarginFi account public keys to be whitelisted. It gets transformed into an array of `PublicKey` objects. This field is optional.

### Required Configuration Fields

The following environment variables are mandatory for the application to run:

- `RPC_ENDPOINT`: The RPC endpoint URL as a string.
- `LIQUIDATOR_PK`: The public key of the liquidator. It is a string that gets converted into a `PublicKey` object.
- `WALLET_KEYPAIR`: The wallet keypair for the liquidator. It is a string that either gets loaded from a file if it exists or gets converted from a JSON string into a `Keypair` object.

## Validation and Parsing

The `env_config` object is created by parsing the `process.env` object through the `envSchema`. If any of the required environment variables are missing or invalid, the application will throw an error during the parsing process.

## Mutually Exclusive Fields

The application ensures that `MARGINFI_ACCOUNT_BLACKLIST` and `MARGINFI_ACCOUNT_WHITELIST` are mutually exclusive. If both are provided, an error is thrown.

## Sentry Integration

If Sentry is enabled (`SENTRY` is `true`), and a `SENTRY_DSN` is provided, the application initializes Sentry for error tracking. It also captures a startup message indicating that the Alpha Liquidator has started.

## Usage

To use the configuration, import `env_config` from the `config.ts` file. Ensure that the required environment variables are set before starting the application.
