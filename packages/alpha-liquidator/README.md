<div align="center">
  <img height="170" src="./images/logo.png" />

  <h1>@mrgnlabs/alpha-liquidator</h1>
  
  <p>
    <!-- Discord -->
    <a href="https://discord.com/channels/882369954916212737"><img alt="Discord Chat" src="https://img.shields.io/discord/882369954916212737?color=blueviolet&style=flat-square"/></a>
    <!-- License -->
    <a href="http://www.apache.org/licenses/LICENSE-2.0"><img alt="License" src="https://img.shields.io/github/license/mrgnlabs/mrgn-ts?style=flat-square&color=ffff00"/></a>
  </p>

  <h4>
    <a href="https://app.marginfi.com/">app.marginfi.com</a>
  </h4>
</div>

A TypeScript bot for liquidating on marginfi v2.

# ⚠️⚠️Important⚠️⚠️ 
**This bot uses the marginfi account and all token accounts owned by the liquidator wallet because it trades outside of marginfi. If there is a USDC balance in the wallet, the bot will automatically deposit it into marginfi and use it for liquidations. Please note that the liquidator will use all token accounts in the wallet for liquidations, so ensure that your wallet doesn't hold any funds not intended for liquidations.**

## Setup
To set up the liquidator, you need to perform the following steps:

Set the required environmental variables by running the following commands:

``` sh
export RPC_ENDPOINT=https://api.mainnet-beta.solana.com
export KEYPAIR_PATH=~/.config/solana/id.json
```

Create a marginfi account for the liquidator and fund it with USDC. Make sure that the wallet at $KEYPAIR_PATH has some USDC.

``` sh
yarn
yarn setup
```

The setup script creates a marginfi account and funds it with any USDC in the provided wallet. If you do not have any USDC, you can fund the wallet later, and the liquidator will fund the marginfi account itself.

After creating the account, set the LIQUIDATOR_PK by running the following command:

``` sh
export LIQUIDATOR_PK=<PK>
```
Once you have completed these steps, the liquidator is ready to operate.

## Operatign the liquidator

You can start the liquidator by running.

``` sh
yarn start
```

You can additionally set `DEBUG=mfi:*` to get detailed logs about liquidators operation.

## How It Works
The liquidator operates in two stages: the liquidation stage and the rebalancing stage.

### Liquidation Stage
The liquidator scans all marginfi accounts and, when it finds an account with bad health, attempts to liquidate it by buying its debt at a discount. In a liquidation, the liquidator pays down a trader's debt and receives in return discounted collateral. If the liquidator doesn't have the exact liability, it borrows it with its own margin account. Once the liquidator obtains the trader's collateral and liability, it can do whatever it wants with them. However, this specific bot attempts to sell them ASAP for USDC in the rebalancing stage.

### Rebalancing Stage
The purpose of the rebalancing stage is to get the liquidator's account into a state where it only holds USDC without any liabilities. The liquidator enters the rebalancing stage whenever it holds any asset in its token account, any non-USDC asset, or any liability in its marginfi account. The liquidator can enter the rebalancing stage at startup, after the liquidation stage ends, or after a liquidation stage error.

The stage is split up into 4 parts:

1. Swapping non-USDC tokens into USDC and depositing them into the marginfi account. This stage is always run at the start of a liquidator cycle and serves to clean up after any error that would leave the account in an intermediary stage. The stage finds any token accounts for mints supported by marginfi and either deposits them to the banks if the account has liabilities or swaps them to USDC and deposits USDC to the marginfi account. One exception is SOL, the bot only swaps SOL above the $MIN_SOL_BALANCE amount, which is set to 10 SOL by default.

2. Selling non-USDC assets. The liquidator withdraws any non-USDC assets from the lending account and swaps them for USDC. The USDC is momentarily kept in the token account to be used in the next stage.

3. Repaying all debt. For each liability in the lending account, the bot swaps USDC into the amount of liability owned and repays the debt. If the bot is missing funds, it withdraws them from the lending account.

4. Depositing remaining USDC. At this stage, remaining USDC is deposited into the lending account to be used for further liquidations.

#### Note About Margin Requirements
Because the liquidator might have a portfolio composed of liabilities and assets collateralizing them, the bot might not be able to rebalance completely at once. After each rebalancing attempt, the bot might start to rebalance again and repeat so until it's ready for liquidations again.

## Integrated Dexes

- Orca Whirlpool

## Contributing

We welcome contributions to the marginfi v2 UI. If you're interested in helping, check out our [contributing guidelines](https://github.com/mrgnlabs/mrgn-ts/blob/main/CONTRIBUTING.md) and join the [mrgn community](https://t.me/mrgncommunity) on Telegram.

## License

`mrgn-ts` is open source software licensed under the Apache 2.0 license.
