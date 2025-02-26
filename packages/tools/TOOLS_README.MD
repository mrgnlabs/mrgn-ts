# TS CLI

## Requirements

* Node
* pnpm (`npm install -g pnpm@latest-10`)
* A wallet (with SOL) at  ~/keys/wallet.json


## Create Env File
* Under packages/tools create a `.env` file.
```
PRIVATE_RPC_ENDPOINT="https://rpc.ironforge.network/mainnet?apiKey=WHATEVER"
MARGINFI_WALLET=home/user/keys/wallet.json
MARGINFI_ENV="production"
```

## Run the Scripts
* `cd packages/tools`
* `pnpm install`
* `pnpm tools` to see list of available CLI tools

# One-Off scripts

## Requirements

* Node
* ts-node (`npm install -g ts-node`)
* A wallet (with SOL) at  ~/keys/wallet.json
* (Optional) create a .env.api and add API_URL=https://rpc.ironforge.network/mainnet?apiKey=WHATEVER

## Run the Scripts
* `cd packages/tools`
* ts-node path_to_script

## Disclaimer
One-off scripts are exactly that: meant to be ran once. Edit them to fit your immediate needs.