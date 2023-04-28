[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/alpha-liquidator/src/utils)

The `utils` folder in the `alpha-liquidator` app of the `mrgn-ts` project contains several TypeScript modules that provide utility functions for working with Solana blockchain accounts, Redis servers, and other common tasks.

The `accountInfos.ts` module exports two functions, `deserializeAccountInfo` and `deserializeAccountInfosMap`, that can be used to decompress and convert the `data` property of `AccountInfo` objects to `Buffer` objects. These functions are useful when working with large amounts of compressed data in Solana accounts. The `chunks.ts` module provides a function, `chunkedGetRawMultipleAccountInfos`, that fetches multiple Solana account infos efficiently by splitting the public keys into smaller batches and using the `_rpcBatchRequest` method to fetch them in parallel. This function also supports chunking the public keys and using a faster encoding format (`"base64+zstd"`) to reduce the amount of data transferred over the network.

The `connection.ts` module exports a `connection` object that can be used to interact with a Solana blockchain node, such as querying account balances, sending transactions, and subscribing to events. The `commitment` level determines how many confirmations a transaction needs before it is considered final. The `fetchWithRetry` function is used to make HTTP requests to the Solana node and retries failed requests up to 3 times to handle temporary network errors.

The `redis.ts` module imports the Redis library from the "ioredis" package and creates a Redis client instance named "redis". This client instance is configured with the host and port of the Redis server and can be used to perform operations such as storing and retrieving data.

The `wait.ts` module provides a utility function, `wait`, that returns a Promise that resolves after a specified amount of time. This function can be used in a variety of scenarios where a delay is needed, such as in animations or network requests.

Overall, these modules provide essential utility functions for working with Solana blockchain accounts, Redis servers, and other common tasks. They can be used in the larger `mrgn-ts` project to perform various operations on the data stored in Solana accounts and Redis servers. Here are some examples of how these modules can be used:

```typescript
import { connection } from "mrgn-ts";

async function getBalance(publicKey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(publicKey, commitment);
  return balance;
}
```

In this example, the `getBalance` function uses the `connection` object to query the balance of a Solana account identified by `publicKey`. The `commitment` level is passed as an argument to ensure that the balance is final and confirmed. The function returns the account balance as a number.

```typescript
import { redis } from "mrgn-ts";

redis.set("myKey", "myValue", (err, result) => {
  if (err) {
    console.error(err);
  } else {
    console.log(result); // "OK"
  }
});
```

In this example, the `set` method is called on the Redis client instance with the key "myKey" and the value "myValue". The callback function is executed once the operation is complete, and any errors are logged to the console. If the operation is successful, the result "OK" is logged to the console.
