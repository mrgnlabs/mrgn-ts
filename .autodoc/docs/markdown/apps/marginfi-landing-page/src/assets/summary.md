[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/marginfi-landing-page/src/assets)

The `token_info.json` file in the `.autodoc/docs/json/apps/marginfi-landing-page/src/assets` folder defines an array of objects that represent different tokens on the Solana blockchain. Each object contains information about a specific token, such as its address, chain ID, decimals, name, symbol, logo URI, and coingecko ID. This information can be used by other parts of the mrgn-ts project to interact with these tokens, such as querying their balances or transferring them between accounts.

For example, if a user wants to transfer some Wrapped SOL tokens to another account, they would need to know the token's address and decimals. This information can be obtained from the object in the array that corresponds to Wrapped SOL. The code snippet below shows how this information can be used to transfer Wrapped SOL tokens:

```
const wrappedSol = tokens.find(token => token.symbol === 'SOL');
const transferAmount = 1000000000; // 1 Wrapped SOL
const recipientAddress = 'So22222222222222222222222222222222222222222';

// Transfer Wrapped SOL to recipient
await connection.sendTransaction(
  new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(recipientAddress),
      lamports: transferAmount,
    })
  ),
  [wallet],
  { skipPreflight: false, preflightCommitment: 'singleGossip' }
);
```

In this example, the `tokens` array is searched for the object that corresponds to Wrapped SOL using the `find` method. The `transferAmount` and `recipientAddress` variables are then set, and the `SystemProgram.transfer` method is used to transfer the tokens to the recipient's address.

Overall, the `token_info.json` file serves as a centralized location for storing information about different tokens used within the mrgn-ts project. This information can be used by other parts of the project to interact with these tokens, reducing errors and improving code maintainability. Developers working on the project can refer to this file to understand the properties of different tokens and use them in their code.
