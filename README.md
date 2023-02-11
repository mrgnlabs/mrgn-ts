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

A monorepo for [marginfi](app.marginfi.com)-related TypeScript projects managed with Turbo.

## About

`mrgn-ts` is an open source monorepo for TypeScript projects. It includes various app UI frontends, such as one for the product `mrgnlend`, as well as SDKs for `marginfi v2`, the `marginfi v2 liquidator` client, and the `liquidity incentive program (LIP)` client.

## Features

- Managed with [Turbo](https://github.com/primer/turbo)
- Includes various app UI frontends and SDKs
- Open source under the Apache 2.0 license

## Usage

1. Fork and clone the repository.

2. Install dependencies:

```
yarn
```

3. marginfi frontend UIs can be found in [apps/](apps/).

4. marginfi SDKs can be found in [packages/](packages/).

## Contributing

We welcome contributions to `mrgn-ts`! Please review our [contributing guidelines](CONTRIBUTING.md) for more information.

## License

`mrgn-ts` is open source software licensed under the Apache 2.0 license.
