### Monitoring Service

[quick-start guide](https://docs.dialect.to/documentation/notifications-and-monitoring).

## To initiate your app (first time)

```
const sdk: DialectSdk<Solana> = Dialect.sdk(
  {
    environment,
  },
  SolanaSdkFactory.create({
    // IMPORTANT: must set environment variable DIALECT_SDK_CREDENTIALS
    // to your dapp's Solana keypair e.g. [170,23, . . . ,300]
    wallet: NodeDialectSolanaWalletAdapter.create(),
  }),
);
// N.b. this created dapp is associated with the wallet public key connected
// to the sdk instance.
const dapp = await sdk.dapps.create({
  name: 'My test dapp',
  description: `My test dapp's description.`,
  blockchainType: BlockchainType.SOLANA
});
```

## Starting the monitoring service

```bash
DIALECT_SDK_ENVIRONMENT=<development-or-production> DIALECT_SDK_CREDENTIALS=[dapp-keypair-uint8-array] MARGINFI_RPC_ENDPOINT=<rpc-url> yarn start:dev
```
