[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/apps/alpha-liquidator/src/utils/chunks.ts)

The code in this file provides a function called `chunkedGetRawMultipleAccountInfos` that fetches multiple Solana account infos in chunks. The function takes in a `Connection` object, an array of public keys (`pks`), and two optional parameters: `batchChunkSize` and `maxAccountsChunkSize`. The function returns a Promise that resolves to a tuple containing the context slot and a Map of account info objects.

The function first creates an empty `Map` object called `accountInfoMap` and sets the `contextSlot` variable to 0. It then uses the `chunks` function to split the `pks` array into smaller arrays of size `batchChunkSize`. For each batch of public keys, the function further splits them into smaller arrays of size `maxAccountsChunkSize`. It then constructs an array of objects, where each object contains a `methodName` property set to `"getMultipleAccounts"` and an `args` property that is an array of arguments to be passed to the `getMultipleAccounts` method. The `args` array contains the `pubkeys` array, the `commitment` object imported from the `connection` module, and a string `"base64+zstd"` that specifies the encoding format for the returned data.

The function then uses `Promise.all` to execute the `getMultipleAccounts` method for each batch of public keys. It first constructs an array of batch objects using the `chunks` function and the `map` method. It then calls the `_rpcBatchRequest` method of the `Connection` object with the batch array as its argument. The `_rpcBatchRequest` method returns a Promise that resolves to an array of `Result` objects. The function extracts the `context.slot` property from each `Result` object and sets the `contextSlot` variable to the maximum value. It then extracts the `value` property from each `Result` object and concatenates them into a single array. The resulting array contains `AccountInfo` objects and `null` values.

Finally, the function iterates over the `accountInfos` array and adds each non-null `AccountInfo` object to the `accountInfoMap` object using the corresponding public key as the key. It then returns the tuple containing the `contextSlot` and `accountInfoMap`.

This function can be used to fetch multiple Solana account infos efficiently by splitting the public keys into smaller batches and using the `_rpcBatchRequest` method to fetch them in parallel. The function also supports chunking the public keys and using a faster encoding format (`"base64+zstd"`) to reduce the amount of data transferred over the network. Here is an example usage of the function:

```
import { Connection } from "@solana/web3.js";
import { chunkedGetRawMultipleAccountInfos } from "./mrgn-ts";

const connection = new Connection("https://api.mainnet-beta.solana.com");

const pks = ["<public key 1>", "<public key 2>", "<public key 3>"];

chunkedGetRawMultipleAccountInfos(connection, pks).then(([contextSlot, accountInfoMap]) => {
  console.log(`Context slot: ${contextSlot}`);
  console.log(`Account info map: ${JSON.stringify([...accountInfoMap])}`);
});
```
## Questions: 
 1. What is the purpose of the `chunks` function?
- The `chunks` function takes an array and a size and returns an array of arrays where each subarray has a length of `size` or less. It is likely used to split up a larger array into smaller chunks for processing.

2. What is the purpose of the `chunkedGetRawMultipleAccountInfos` function?
- The `chunkedGetRawMultipleAccountInfos` function takes a Solana connection object, an array of public keys, and two optional chunk sizes as arguments. It uses the `chunks` function to split the public keys into batches and then fetches account information for each batch using the Solana `getMultipleAccounts` method. The function returns a Promise that resolves to a tuple containing the highest slot number of all the fetched accounts and a Map of account information objects keyed by their public key.

3. Why is the `base64+zstd` encoding used instead of `base64` for fetching account information?
- The `base64+zstd` encoding is used instead of `base64` because it is faster when fetching from the Solana RPC. According to a comment in the code, `base64` was found to be 3x slower than `zstd` when fetching.