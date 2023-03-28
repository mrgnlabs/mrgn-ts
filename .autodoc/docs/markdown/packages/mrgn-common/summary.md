[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/packages/mrgn-common)

Name: nodeWallet.ts

Summary: The `nodeWallet.ts` file contains a class called `NodeWallet` that provides a way to manage Solana keypairs and sign transactions on the Solana blockchain. This class is used in various parts of the `mrgn-ts` project to interact with the Solana blockchain.

The `NodeWallet` class has several methods for managing keypairs and signing transactions. The `load` method takes a path to a JSON file containing a Solana keypair and loads it into memory. The `signTransaction` method takes a transaction object and signs it with the loaded keypair. The `getPublicKey` method returns the public key associated with the loaded keypair.

This class is used in various parts of the `mrgn-ts` project to interact with the Solana blockchain. For example, it can be used to load a keypair for a user's Solana wallet and sign transactions on their behalf. It can also be used to sign transactions for a smart contract on the Solana blockchain.

Example usage:

```
import { NodeWallet } from '@mrgn/common';

// Load a keypair from a JSON file
const wallet = new NodeWallet();
await wallet.load('/path/to/keypair.json');

// Get the public key associated with the loaded keypair
const publicKey = wallet.getPublicKey();

// Sign a transaction with the loaded keypair
const transaction = new Transaction().add(instruction);
await wallet.signTransaction(transaction);
```
