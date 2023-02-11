<div align="center">
  <img height="170" src="./images/logo.png" />

  <h1>mrgn-ts</h1>
  
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

# @mrgnlabs/alpha-liquidator

A TypeScript client for liquidating on marginfi v2.

## Key features

* Uses [Jupiter](https://jup.ag) under the hood
* Implements three steps for account rebalancing:
    * Withdraw all non-USDC deposits from the account and sell them for USDC
    * Repay all debt with available USDC
    * Deposit remaining USDC in the lending account to untie collateral

## Usage

To use this package, you will need to have Node.js and npm installed on your machine.

## Contributing

We welcome contributions to the marginfi v2 UI. If you're interested in helping, check out our [contributing guidelines](https://github.com/mrgnlabs/mrgn-ts/blob/main/CONTRIBUTING.md) and join the [mrgn community](https://t.me/mrgncommunity) on Telegram.

## License

`mrgn-ts` is open source software licensed under the Apache 2.0 license.
