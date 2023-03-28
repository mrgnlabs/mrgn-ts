[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/apps/marginfi-v2-ui/src/utils/index.ts)

This file contains various utility functions and types that are used in the mrgn-ts project. 

The first section of the code imports several dependencies, including `@solana/web3.js`, `superstruct`, and `@mrgnlabs/mrgn-common`. It also imports a JSON file called `token_info.json` that contains metadata about various tokens. 

The next section of the code defines two utility functions: `floor` and `ceil`. These functions take a `value` and a `decimals` argument and return the `value` rounded down or up to the specified number of decimal places, respectively. These functions may be used throughout the project to perform math operations on token values. 

The next section of the code defines several types and functions related to token metadata. The `TokenMetadataRaw` type represents the raw metadata for a single token, while the `TokenMetadataList` type represents an array of `TokenMetadataRaw` objects. The `parseTokenMetadata` function takes a `TokenMetadataRaw` object and returns a `TokenMetadata` object that contains only the `logoURI` property. The `parseTokenMetadatas` function takes an array of `TokenMetadataRaw` objects and returns an object that maps token symbols to `TokenMetadata` objects. Finally, the `loadTokenMetadatas` function asserts that the `tokenInfos` variable (which is imported from `token_info.json`) is an array of `TokenMetadataRaw` objects, and then returns the result of calling `parseTokenMetadatas` on `tokenInfos`. These functions may be used throughout the project to load and parse token metadata. 

The final section of the code defines two utility functions related to airdrops. The `FAUCET_PROGRAM_ID` constant represents the public key of the program that handles airdrops. The `makeAirdropCollateralIx` function takes an `amount`, a `mint` public key, a `tokenAccount` public key, and a `faucet` public key, and returns a `TransactionInstruction` object that can be used to initiate an airdrop. This function first generates a program-derived address (PDA) for the faucet using `PublicKey.findProgramAddressSync`, and then constructs an array of `keys` that includes the PDA, the `mint` public key, the `tokenAccount` public key, the `TOKEN_PROGRAM_ID` constant, and the `faucet` public key. Finally, it returns a new `TransactionInstruction` object that includes the `FAUCET_PROGRAM_ID` constant, a buffer containing the `amount` and some additional data, and the `keys` array. This function may be used throughout the project to initiate airdrops.
## Questions: 
 1. What is the purpose of the `floor` and `ceil` functions?
- The `floor` and `ceil` functions are used to round a number to a specified number of decimal places.

2. What is the `TokenMetadata` type and how is it used?
- The `TokenMetadata` type is a custom type that represents metadata for a token. It is used in the `parseTokenMetadata` and `parseTokenMetadatas` functions to parse raw token metadata and return a standardized format.

3. What is the `makeAirdropCollateralIx` function and what does it do?
- The `makeAirdropCollateralIx` function creates a transaction instruction for an airdrop collateral operation. It takes in parameters such as the amount, mint, token account, and faucet, and returns a `TransactionInstruction` object that can be used to execute the operation.