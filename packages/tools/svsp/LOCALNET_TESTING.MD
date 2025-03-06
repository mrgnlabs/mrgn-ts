## Want to test SVSP on localnet?

Make sure your validator is on 2.0 or greater:

```
sh -c "$(curl -sSfL https://release.anza.xyz/v2.2.0/install)"
```

Make sure the svsp program is deployed when launching the validator. First, build it from source and copy the .so, then deploy with something like:

```
solana-test-validator \
  --ledger .anchor/test-ledger \
  --mint FDr3iLdfyyzMmge9rN5sqQ38PgbrXY94VDW726EUN2kK \
  --ticks-per-slot 8 \
  --slots-per-epoch 32 \
  --bpf-program 2jGhuVUuy3umdzByFx8sNWUAaf5vaeuDm78RDPEnhrMr /home/fish/mrgn/marginfi-v2/marginfi-v2/target/deploy/marginfi.so \
  --bpf-program 5XaaR94jBubdbrRrNW7DtRvZeWvLhSHkEGU3jHTEXV3C /home/fish/mrgn/marginfi-v2/marginfi-v2/target/deploy/mocks.so \
  --bpf-program SVSPxpvHdN29nkVg9rPapPNDddN5DipNLRUFhyjFThE tests/fixtures/spl_single_pool.so \
  --account DeyH7QxWvnbbaVB4zFrf4hoq7Q8z1ZT14co42BGwGtfM tests/fixtures/bonk_bank.json \
  --account 4kNXetv8hSv9PzvzPZzEs1CTH6ARRRi2b8h6jk1ad1nP tests/fixtures/cloud_bank.json \
  --account Fe5QkKPVAh629UPP5aJ8sDZu8HTfe6M26jDQkKyXVhoA tests/fixtures/pyusd_bank.json \
  --account 8FRFC6MoGGkMFQwngccyu69VnYbzykGeez7ignHVAFSN tests/fixtures/localnet_usdc.json \
  --account mfC1LoEk4mpM5yx1LjwR9QLZQ49AitxxWkK5Aciw7ZC tests/fixtures/staging-deploy.json \
  --bind-address 0.0.0.0 \
  --rpc-port 8899
```

(Note the above uses mrgnfi-v2's fixture accounts). Note that a wallet with some SOL is also
deployed for easier testing, as well as the mrgn and mock (pretend Pyth) programs.

## Testing Steps

- init_validator (`ts-node svsp/init_validator.ts`)
- init_single_pool (`ts-node svsp/init_single_pool.ts`)
- init_stake_acc for user 0 (`ts-node svsp/init_stake_acc.ts`)
- delegate_stake_acc for user 0 to validator (`ts-node svsp/delegate_stake_acc.ts`)
- deposit into single pool (`ts-node svsp/deposit_single_pool.ts`)
- send mock mev rewards to pool (`ts-node svsp/send_mev.ts`)
- init svsp onramp (`ts-node svsp/init_svsp_onramp.ts`)
- replenish pool (`ts-node svsp/svsp_replenish_pool.ts`)

## Notes for Mainnet

* Someone has to call `init_svsp_onramp` for each svsp pool, just once. You don't have to pay the 1.1 SOL that's the minimum for delegation, you can just pay the rent.
* MEV rewards can't cycle until there's at least ~1.1 SOL in free lamports
* ts-node svsp/svsp_replenish_pool.ts should be cranked every epoch or so, but in practice there's no rush. We should, at least, crank on every deposit, on every withdraw, and roughly once a week.
* From a marginfi pov, if you withdraw while replenish pool has not completed cycling your mev rewards into the main pool, you lose out on those mev rewards. When users withdraw, we might pop up a warning if there's a lot of free lamps before the latest replenish.
