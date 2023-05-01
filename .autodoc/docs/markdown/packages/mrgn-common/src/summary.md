[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/packages/mrgn-common/src)

The `mrgn-common/src` folder contains several TypeScript files that provide various utility functions, constants, and types for the `mrgn-ts` project.

The `accounting.ts` file provides two functions for converting between annual percentage rate (APR) and annual percentage yield (APY), which are useful for financial calculations involving different investment options. The `apyToApr` function takes an APY value and an optional compounding frequency and returns the corresponding APR value. The `aprToApy` function takes an APR value and an optional compounding frequency and returns the corresponding APY value. These functions can be used to compare different investment options that may have different compounding frequencies.

The `constants.ts` file provides several constants and types that are used throughout the `mrgn-ts` project. These include default options for sending and confirming transactions on the Solana blockchain, as well as a constant for the number of decimal places used by the USDC stablecoin. These constants and types can be used to simplify code and ensure consistency across different parts of the project.

The `conversion.ts` file provides several utility functions for converting and manipulating different types of data in the `mrgn-ts` project. These include functions for converting wrapped I80F48 numbers to `BigNumber` objects, converting token amounts between UI and native representations, and shortening addresses. These functions can be used to simplify data manipulation and conversion in the project.

The `index.ts` file exports various modules from the `mrgn-ts` project, including constants, types, miscellaneous functions, conversion utilities, accounting tools, and a module called `spl`. Additionally, it exports a class called `NodeWallet` from a file called `nodeWallet`. This file serves as a way to organize and make available various pieces of functionality within the `mrgn-ts` project, allowing for easier development and maintenance of the project as a whole.

The `misc.ts` file provides helper functions for transaction processing and keypair loading in the `mrgn-ts` project. These functions can be used to load keypairs and process transactions on the Solana blockchain.

The `nodeWallet.ts
