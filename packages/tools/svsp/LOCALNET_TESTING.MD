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
  --bpf-program 2jGhuVUuy3umdzByFx8sNWUAaf5vaeuDm78RDPEnhrMr /home/fish/mrgn/marginfi-v2/marginfi-v2/target/deploy/marginfi.so \
  --bpf-program 5XaaR94jBubdbrRrNW7DtRvZeWvLhSHkEGU3jHTEXV3C /home/fish/mrgn/marginfi-v2/marginfi-v2/target/deploy/mocks.so \
  --bpf-program SVSPxpvHdN29nkVg9rPapPNDddN5DipNLRUFhyjFThE tests/fixtures/spl_single_pool.so \
  --account mfC1LoEk4mpM5yx1LjwR9QLZQ49AitxxWkK5Aciw7ZC tests/fixtures/staging-deploy.json \
  --bind-address 0.0.0.0 \
  --rpc-port 8899
  ```

  (Note the above uses mrgnfi-v2's fixture accounts). Note that a wallet with some SOL is also
  deployed for easier testing, as well as the mrgn and mock (pretend Pyth) programs.

  ## Testing Steps

  * init_validator (`ts-node svsp/init_validator.ts`)
  * init_single_pool (`ts-node svsp/init_single_pool.ts`)
  * init_stake_acc for user 0 (`ts-node svsp/init_stake_acc.ts`)
  * delegate_stake_acc for user 0 to validator (`ts-node svsp/delegate_stake_acc.ts`)
  * deposit into single pool (`ts-node svsp/deposit_single_pool.ts`)
  * send mock mev rewards to pool (`ts-node svsp/send_mev.ts`)
  * init svsp onramp ()
