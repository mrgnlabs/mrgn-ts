# @mrgnlabs/marginfi-client-v2

## 6.0.0

### Major Changes

- dfc2b53: # 🚀 Major Changes (version 6.0.0)

  - **Improved SOL Wrapping & Unwrapping** 🌀
    Handling of **native SOL and wSOL token accounts** has been significantly improved across the platform.

    - More robust detection and management of wSOL accounts.
    - Improved behavior in transaction builders like `makeLooperTx` and `makeRepayWithCollateralTx`.
    - Better UX and fewer edge case failures when wrapping or unwrapping SOL in margin and flashloan flows.

  - **MEV Reward Support via Stake Pool Flow** 💰
    Users who deposit native SOL into the **Single Validator Stake Pool (SVSP)** now earn MEV rewards on their stake—just as they would when staking with a validator.

    - Each epoch, MEV rewards earned by the **main pool** are temporarily moved to an **"on-ramp" account**, where they are staked to the same validator.
    - In the following epoch, that stake is moved back into the **main pool**.
    - This cycle repeats each epoch for new MEV rewards.

  - **New IDL Logic & Account Inference** 🧠
    This release revamps instruction generation with **implied account arguments** and convenience flags:

    ## 🧩 Implied Anchor Arguments

    - Most instructions now infer required accounts based on minimal inputs.
    - Reduces boilerplate significantly when using the SDK from TypeScript.

    ## 📉 Deposit Up to Limit

    - New `depositUpToLimit` flag allows deposits to fill the remaining capacity of a bank.

    ## ⚠️ Backwards Compatibility Notes

    - Most instructions now use updated account names (e.g., `marginfi_group` ➝ `group`) but maintain account order.
    - **Non-breaking** for Rust clients using positional metas.
    - **Potentially breaking** for TypeScript clients or CPI consumers that pass accounts manually.
    - Use `accountsPartial` to override inference where necessary.

    ## 🛠 Minor Improvements to Bundle Handling

    - Slight improvements to bundle error handling.
    - More consistent signature behavior

## 5.0.0

### Major Changes

- 9215e8f: # Major SDK Update 🚀

  This release brings **significant improvements**, optimizations, and new features to the SDK—focusing on transaction builders, processing pipelines, and staked collateral support. **Please update your implementation** if you are using any transaction builders, as there are **context and syntax changes** (see provided JSDoc documentation for each function).

  ***

  ## 🔄 Transaction Builder Enhancements

  - **Updated Builder Syntax**

    - `account.make<Action>Tx` functions now include minor context and syntax changes to allow for greater customization.
    - **Flashloan Builders:**
      - Builders such as `makeLooperTx` and `makeRepayWithCollateralTx` have been revamped to optimize transaction size and prevent instruction overflow.

  - **Action Required:**
    - **Update Your Code:** Ensure you update your transaction builder usage to match the new syntax.

  ***

  ## 💼 Extended Solana Transaction Types

  All builders now return a `SolanaTransaction`, an extension of the standard Solana web3.js `Transaction` and `VersionedTransaction`. This extended type includes:

  - **`type`:** Enum representing the available SDK actions.
  - **`signers`:** An array of signers required for the transaction.
  - **`addressLookupTables`:** Lookup tables used during transaction signing and decompilation.
  - **`unitsConsumed`:** A value (default or dynamically updated) to help compute the priority fee, ensuring an optimal landing rate.

  **Benefits:**

  - Improved transaction inspection and decompilation.
  - Enhanced integration with custom transaction processing pipelines.

  ***

  ## ⚙️ Advanced Transaction Processing Pipeline

  The new processing flow is modular and highly optimized for both standard and flashloan transactions. There are two ways to access the pipeline:

  1. **Within MarginfiAccountWrapper Actions:**

     - All account actions (e.g., deposit, withdraw, borrow) include the processing pipeline as part of their internal logic.

  2. **Standalone from the Client:**
     - Use the standalone function `processTransactions` or leverage prefilled configuration via `client.processTransactions`.

  ### Pipeline Features

  1. **Simulate to Fetch Compute Unit (CU) Limits:**

     - The transaction is simulated (ignoring the blockhash) to determine the required compute unit size.
     - The CU limit instruction is then updated accordingly.

  2. **Transaction Formatting via `formatTransactions`:**

     - **Heavily Optimized for Flashloans:**
       - `formatTransactions` is tailored for flashloan transactions to ensure maximum throughput and reliability.
     - **Ad-hoc Integration:**
       - This step can be integrated ad-hoc into your existing transaction processing logic.
     - **Updates Blockhash:**
       - Ensures the transaction uses the most recent blockhash.
     - **Jito Bundles Support:**
       - Appends a bundle tip if the transaction is destined for a jito bundle.
       - Measures transaction size to decide whether the bundle tip should be appended inline or sent as a separate transaction.
       - _Note:_ Flashloan transactions will always have the bundle tip appended as a separate transaction due to fixed instruction index constraints.
     - **Accurate Priority Fee Assignment:**
       - Uses the computed CU size from simulation to assign a precise priority fee when sending over RPC.
     - **Optional Transaction Tagging:**
       - If `addTransactionTags` is enabled, a tag corresponding to the transaction action is added for easier parsing.

  3. **Pre-Execution Simulation:**

     - An additional simulation step is performed to validate the transaction before waiting for it to land.

  4. **Flexible Execution:**
     - Transactions are routed through jito bundles or RPC based on your configuration, with built-in fallbacks for optimal execution.
     - Special routing logic is applied for flashloan transactions.

  ***

  ## ⭐ Additional Enhancements

  - **Enhanced Flashloan Support** 🏦

    - Improved flashloan handling and execution.
    - More efficient processing of flashloan transactions.

  - **More Configurable SDK Functions** ⚙️

    - New options to fine-tune SDK behavior.
    - Increased flexibility for integrators.

  - **Optimized Flashloan Transaction Processing** ⚡

    - Reduced overhead.
    - Improved speed and reliability.

  - **Full JSDoc Support** 📖

    - Comprehensive documentation for improved developer experience.
    - Enhanced type safety and inline guidance.

  - **Staked Collateral Support** 🔐

    - **New Functionality:**
      - The SDK now includes `makeAddPermissionlessStakedBankIx` within the group class to create new staked banks permissionlessly.
      - Pricing functions have been updated to handle this new staked collateral type.
    - **Future Expansion:**
      - This functionality will be further expanded in future releases.
      - For a full implementation (including uploading metadata and creating single SPL stake pools), please refer to:
        `mrgn-ts/apps/marginfi-v2-ui/src/pages/staked-assets/create.tsx`.

  - **General Improvements:**
    - Resolved multiple issues from previous versions.
    - Overall performance optimizations and stability improvements.

  ***

  Feel free to reach out with any questions or feedback regarding these changes. Happy coding!

### Patch Changes

- Updated dependencies [9215e8f]
  - @mrgnlabs/mrgn-common@2.0.0

## 5.0.0-beta.1

### Major Changes

- 0575628: # 🚀 v5.0.0-beta.0 - Major Release (2025-02-10)

  This is a **major update** that brings significant improvements, optimizations, and new features to the SDK.

  - **Enhanced Flashloan Support** 🏦

    - Improved handling and execution of flashloans.
    - More efficient processing of transactions.

  - **More Configurable SDK Functions** ⚙️

    - Added new options to fine-tune SDK behavior.
    - Greater flexibility for integrators.

  - **Optimized Flashloan Transaction Processing** ⚡

    - Reduced overhead for executing flashloan transactions.
    - Improved speed and reliability.

  - **Added Full JSDoc Support** 📖

    - Comprehensive documentation for better developer experience.
    - Improved type safety and inline documentation.

  - **Staked Collateral Support** 🔐

    - Introduced support for staked collateral in margin strategies.
    - Enables more flexible and efficient collateral management.

  - Resolved multiple issues from previous versions.
  - General performance optimizations and stability improvements.

  ⚠️ **This is a beta release!** Please test and provide feedback before full release. 🚀

### Patch Changes

- Updated dependencies [0575628]
  - @mrgnlabs/mrgn-common@2.0.0-beta.1

## 5.0.0-beta.0

### Major Changes

- 0575628: # 🚀 v5.0.0-beta.0 - Major Release (2025-02-10)

  This is a **major update** that brings significant improvements, optimizations, and new features to the SDK.

  - **Enhanced Flashloan Support** 🏦

    - Improved handling and execution of flashloans.
    - More efficient processing of transactions.

  - **More Configurable SDK Functions** ⚙️

    - Added new options to fine-tune SDK behavior.
    - Greater flexibility for integrators.

  - **Optimized Flashloan Transaction Processing** ⚡

    - Reduced overhead for executing flashloan transactions.
    - Improved speed and reliability.

  - **Added Full JSDoc Support** 📖

    - Comprehensive documentation for better developer experience.
    - Improved type safety and inline documentation.

  - **Staked Collateral Support** 🔐

    - Introduced support for staked collateral in margin strategies.
    - Enables more flexible and efficient collateral management.

  - Resolved multiple issues from previous versions.
  - General performance optimizations and stability improvements.

  ⚠️ **This is a beta release!** Please test and provide feedback before full release. 🚀

### Patch Changes

- Updated dependencies [0575628]
  - @mrgnlabs/mrgn-common@2.0.0-beta.0
