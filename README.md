<div align="center">
  <img height="170" src="./images/logo.png" />

  <h1>mrgn-ts</h1>
  
  <p>
    <!-- Build -->
    <a><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/mrgnlabs/mrgn-ts/main.yml?style=flat-square"/></a>
    <!-- Discord -->
    <a href="https://discord.com/channels/882369954916212737"><img alt="Discord Chat" src="https://img.shields.io/discord/882369954916212737?color=blueviolet&style=flat-square"/></a>
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
    <a href=""><img alt="alpha-liquidator" src="https://img.shields.io/github/package-json/v/mrgnlabs/mrgn-ts?color=white&filename=packages%2Falpha-liquidator%2Fpackage.json&label=alpha-liquidator&style=flat-square"/></a>
    <a href=""><img alt="marginfi-client-v2" src="https://img.shields.io/github/package-json/v/mrgnlabs/mrgn-ts?color=white&filename=packages%2Fmarginfi-client-v2%2Fpackage.json&label=marginfi-client-v2&style=flat-square"/></a>
    <a href=""><img alt="lip-client" src="https://img.shields.io/github/package-json/v/mrgnlabs/mrgn-ts?color=white&filename=packages%2Flip-client%2Fpackage.json&label=lip-client&style=flat-square"/></a>
  </p>

  <h4>
    <a href="https://app.marginfi.com/">app.marginfi.com</a>
  </h4>
</div>

A monorepo for [marginfi](https://app.marginfi.com)-related TypeScript projects managed with Turbo.

## About

`mrgn-ts` is an open source monorepo for TypeScript projects. It includes various app UI frontends, such as one for the product `mrgnlend`, as well as SDKs for `marginfi v2`, the `marginfi v2 liquidator` client, and the `liquidity incentive program (LIP)` client.

## Features

- Managed with [Turbo](https://github.com/vercel/turbo)
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

## Updating the IDL

For historical reasons, the IDL file in this repository should be updated by using
the marginfi-v2 CLI tool to ensure the IDL stays in its canonical format.
This is largely due to changes in the byte packing code used by Anchor,
and the fact that Rust removed the `#repr(packed)` option in later releases.

To update the IDL:
Use the [marginfi-v2-cli](https://github.com/mrgnlabs/marginfi-v2/tree/main/clients/rust/marginfi-cli)
and run the `patch-idl` command against the existing marginfi.json IDL in this repository.

Ensure you are on the feature branch in mrgn-ts, the branch with IDL changes.

For example, run this command from the root of the marginfi-v2 repository,
```
cargo run \
            --package marginfi-v2-cli \
            --features dev \
            -- patch-idl <path-to-marginfi.json>
```

This produces a new, modified marginfi.json file alongside the original file.
The _original file can be removed.

Lint the new file using the prettier linter (.prettierrc) -- in VSCode you
can simply use Format Document and it applies the lint automatically.

Review the IDL changes to make sure the new features/types in the branch
are reflected in the new IDL.

Commit the IDL changes and merge.
