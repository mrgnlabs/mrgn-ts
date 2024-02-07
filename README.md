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

For historical reasons, the IDL file in this repository should be updated using
the marginfi-v2 CLI tool to ensure the IDL stays in its canonical format.
This is largely due to changes in the byte packing code used by Anchor,
and the fact that Rust removed the `#repr(packed)` option in later releases.
The process is to build the IDL file in the marginfi-v2 repository, patch it,
then copy it into this repository and format it (via prettier).

To update the IDL:

1. Checkout the [marginfi-v2-cli](https://github.com/mrgnlabs/marginfi-v2/tree/main)
   repository and build it. Ensure you are on an x86-64 machine to get the build
   to succeed. Ensure the [solana](https://docs.solanalabs.com/cli/install) CLI tool is installed,
   alongside anchor and rust and yarn.

2. Run marginfi-v2/scripts/build-workspace to generate the original IDL (anchor build)

3. Use the [marginfi-v2-cli](https://github.com/mrgnlabs/marginfi-v2/tree/main/clients/rust/marginfi-cli)
   and run the `patch-idl` command against the generated marginfi.json IDL in the marginfi-v2 repository.

Ensure you are on main branch in marginfi-v2.

For example, run this command from the root of the marginfi-v2 repository,

```
cargo run \
            --package marginfi-v2-cli \
            --features dev \
            -- patch-idl target
```

where `target` is the target directory for rust binaries. There should be an idl
folder with the idl inside of `target`.

This produces a modified marginfi.json file alongside the original file.
The \_original file can be removed but is useful for checking diffs.

4. Copy the marginfi.json file and the marginfi-types.ts into this repository.
5. Lint the new IDL file using the prettier linter (.prettierrc) -- in VSCode you
   can simply use Format Document and it applies the lint automatically.

Review the IDL changes to make sure the new features/types in marginfiv2
are reflected in the new IDL. For example new instructions or types, should be
reflected in the new IDL.

Commit the IDL changes and merge in the same mrgn-ts PR that adds features that rely on
the new IDL. These should be committed together to ensure the new feature works.
