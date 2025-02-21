<div align="center">
  <img height="170" src="./images/logo.png" />

  <h1>mrgn-ts</h1>
  
  <p>
    <!-- Build -->
    <a><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/mrgnlabs/mrgn-ts/main.yml?style=flat-square"/></a>
    <!-- License -->
    <a href="http://www.apache.org/licenses/LICENSE-2.0"><img alt="License" src="https://img.shields.io/github/license/mrgnlabs/mrgn-ts?style=flat-square&color=ffff00"/></a>
    <!-- Total lines -->
    <a href=""><img alt="License" src="https://img.shields.io/tokei/lines/github/mrgnlabs/mrgn-ts?style=flat-square&color=000000"/></a>
    <!-- Twitter -->
    <a href="https://twitter.com/intent/tweet?text=Wow:&url=https%3A%2F%2Ftwitter.com%2Fmarginfi"><img alt="Twitter" src="https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Ftwitter.com%2Fmarginfi"/></a>
    <br>
    <!-- Versions -->
    <a href=""><img alt="marginfi-v2-ui" src="https://img.shields.io/github/package-json/v/mrgnlabs/mrgn-ts?color=white&filename=apps%2Fmarginfi-v2-ui%2Fpackage.json&label=marginfi-v2-ui&style=flat-square"/></a>
    <a href=""><img alt="marginfi-landing-page" src="https://img.shields.io/github/package-json/v/mrgnlabs/mrgn-ts?color=white&filename=apps%2Fmarginfi-landing-page%2Fpackage.json&label=marginfi-landing-page&style=flat-square"/></a>
    <a href=""><img alt="marginfi-client-v2" src="https://img.shields.io/github/package-json/v/mrgnlabs/mrgn-ts?color=white&filename=packages%2Fmarginfi-client-v2%2Fpackage.json&label=marginfi-client-v2&style=flat-square"/></a>
  </p>

  <h4>
    <a href="https://app.marginfi.com/">app.marginfi.com</a>
  </h4>
</div>

A monorepo for [marginfi](https://app.marginfi.com)-related TypeScript projects managed with Turbo.

## About

`mrgn-ts` is an open source monorepo for TypeScript projects. It includes various app UI frontends, such as one for the product `mrgnlend` and `the arena`, as well as SDKs for `marginfi v2`.

## Features

- Managed with [Turbo](https://github.com/vercel/turbo)
- Includes various app UI frontends and SDKs
- Open source under the Apache 2.0 license

## Usage

1. Fork and clone the repository.

2. Install dependencies:

```
pnpm install
```

3. marginfi frontend UIs can be found in [apps/](apps/).

4. marginfi SDKs can be found in [packages/](packages/).

## Contributing

We welcome contributions to `mrgn-ts`! Please review our [contributing guidelines](CONTRIBUTING.md) for more information.

## License

`mrgn-ts` is open source software licensed under the Apache 2.0 license.

## Updating the IDL

The IDL can be copied directly from the target/deploy folder. Make sure you have built without any feature flags (i.e. `anchor build`). The default configuration is correct for mainnet.

KNOWN BUG: In some instances, anchor will not generate "errors" in idl.json and this needs to be manually copied over and edited.
