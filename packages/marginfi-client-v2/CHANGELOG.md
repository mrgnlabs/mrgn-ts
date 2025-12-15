# @mrgnlabs/marginfi-client-v2

## 6.3.0

### Minor Changes

- 3ac8ffa: ## Summary

  Version **1.6** introduces a major upgrade to interest rate modeling, oracle configuration, and risk management. The legacy three-point interest rate model is replaced with a flexible seven-point curve, enabling fine-grained control over rates across utilization levels. This release also adds a fixed-price oracle type, improves administrative risk controls (including controlled deleveraging of sunset banks), and introduces on-chain bank metadata for improved transparency.

  ***

  ## ✨ New Features & Improvements

  ### Seven-Point Interest Rate Curve

  - Deprecates the legacy three-point plateau / max-rate model.
  - Introduces a **seven-point utilization-based interest curve**:
    - Fixed endpoints at **0% utilization** and **100% utilization**
    - **Five configurable intermediate points**
  - Each point defines:
    - A utilization percentage
    - A base interest rate
  - Points must be ordered with:
    - Increasing utilization
    - Non-decreasing interest rates
  - Interest rates are determined via **linear interpolation** between the two nearest points.
  - Enables precise shaping of borrow/lend incentives at different utilization levels.

  ### Fixed-Price Oracle Type

  - Adds a new `OracleSetup::Fixed` oracle type.
  - Banks using this oracle:
    - Store a declared price at `bank.config.fixed_price`
    - Do **not** rely on external oracle feeds
    - Never become stale
  - Intended use cases:
    - Stablecoins
    - Sunset or defunct assets
    - Assets with extremely stable pricing
  - Banks may switch away from `Fixed`; if so, `fixed_price` may contain junk data.

  ### Risk Management Enhancements

  - Adds **admin-only deleveraging** for defunct or sunset banks.
    - Functions similarly to a liquidation of a healthy account
    - Executed with **no dollar profit**
    - Enables orderly unwinding of risky or deprecated assets
  - Adds safeguards to limit the impact of a compromised admin.
  - Banks at risk of deleveraging are expected to receive significant advance warning.

  ### Bank Metadata

  - Introduces a new on-chain metadata account per bank.
  - Stores:
    - Plain-English token name
    - Token description
  - Improves protocol transparency and UX.

  ***

  ## 🆕 New & Changed Fields

  ### Bank Fields

  - `zero_util_rate`
    Base interest rate at **0% utilization**.

    - Percentage stored as `u32`, scaled to **1000%**
    - Example: 100% = `0.1 * u32::MAX`

  - `hundred_util_rate`
    Base interest rate at **100% utilization**.

    - Same scaling as `zero_util_rate`

  - `points`
    Exactly **five intermediate curve points** between 0% and 100%.

    - Each point contains:
      - `util`: utilization %, scaled to 100%
      - `rate`: interest rate %, scaled to 1000%
    - Unused points must have `util = 0`

  - `curve_type`

    - `INTEREST_CURVE_LEGACY (0)` — banks created before v1.6
    - `INTEREST_CURVE_SEVEN_POINT (1)` — banks created after v1.6
    - All banks will migrate to seven-point curves post-migration

  - `bank.config.fixed_price`
    - Type: `WrappedI80F48`
    - Used only when `OracleSetup::Fixed` is active

  ### Group Fields

  - `deleverage_withdraw_window_cache`
    Limits how much the `risk_admin` can deleverage per day
  - `risk_admin`
    Authorized to perform bankruptcies and deleverages
  - `metadata_admin`
    Authorized to update bank metadata

  ***

  ## ⚠️ Breaking Changes

  ### Liquidators

  - The `liquidate` instruction now requires **two additional arguments**:
    - Length of the liquidator’s remaining accounts slice
    - Length of the liquidatee’s remaining accounts slice
  - All liquidator implementations must be updated accordingly.

  ***

## 6.1.4

### Patch Changes

- bd93013: fix: bumped switchboard packages to improve cranking

## 6.1.3

### Patch Changes

- fed2ae5: fix: reverted back to tsc compiler

## 6.1.3-beta.0

### Patch Changes

- fed2ae5: fix: reverted back to tsc compiler

## 6.1.2

### Patch Changes

- bb0bf28: bugfix: added types to export

## 6.1.1

### Patch Changes

- 1738ad6: program 0.1.4

## 6.1.0

### Minor Changes

- 757451d: ### 🔄 Behavior Updates & Integration Notes

  - **Account Health Caches Invalidated** 🧠
    The account health cache introduced in `0.1.2` is no longer valid. The cache now contains **richer internal risk state data**.
    Liquidators, indexers, and analytics consumers **must discard old caches** and recompute from fresh data.
    → See [#325](https://github.com/mrgnlabs/marginfi/issues/325) for the full list of changes.
  - **Gapless Account Support + Sorted Balances** 📚
    All remaining accounts and user lending balances are now packed in **sorted order by pubkey**, with **no gaps**.

    #### Benefits:

    - No more guessing the order of user balances.
    - Simplifies database indexing and stateless client logic.
    - Improves determinism and parsing of `MarginfiAccount`s.

    #### Behavior Details:

    - Accounts that are **not currently sorted** will sort themselves during the next interaction (e.g. `deposit`, `withdraw`, `repay`, etc.).
    - When adding **new positions** (e.g. during `borrow` or `liquidation`), the account becomes fully sorted.
    - You can also **manually sort** an account using `lending_account_sort_balances`.
    - When parsing user accounts:
      - You may safely assume that once you encounter an empty slot in lending balances, **the rest are also empty**.
      - All consumers **must pass remaining accounts in sorted order by pubkey**.

  - **Updated Instruction Constraints** ⚠️
    - The `bank_liquidity_vault_authority` account is **no longer `mut`** in the `withdraw` instruction.
      This should not affect consumers using the latest IDL and should help reduce instruction size slightly.

## 6.0.2

### Patch Changes

- 2bb8f54: fix: added type overrides for inferred accounts

## 6.0.1

### Patch Changes

- e9b7c96: ### 🐛 Patch Fix

  - Removed reference to a missing environment variable that was causing runtime issues
  - No functional changes to SDK logic.

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
