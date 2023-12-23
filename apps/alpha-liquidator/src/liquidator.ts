import { Connection, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from "@solana/web3.js";
import {
  MarginRequirementType,
  MarginfiAccountWrapper,
  MarginfiClient,
  PriceBias,
  USDC_DECIMALS,
} from "@mrgnlabs/marginfi-client-v2";
import { nativeToUi, NodeWallet, shortenAddress, sleep, uiToNative } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
import { NATIVE_MINT } from "@solana/spl-token";
import { captureException, captureMessage, env_config } from "./config";
import BN from "bn.js";
import { BankMetadataMap, loadBankMetadatas } from "./utils/bankMetadata";
import { Bank } from "@mrgnlabs/marginfi-client-v2/dist/models/bank";
import { chunkedGetRawMultipleAccountInfos } from "./utils/chunks";

const DUST_THRESHOLD = new BigNumber(10).pow(USDC_DECIMALS - 2);
const DUST_THRESHOLD_UI = new BigNumber(0.01);
const MIN_LIQUIDATION_AMOUNT_USD_UI = env_config.MIN_LIQUIDATION_AMOUNT_USD_UI;

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const MIN_SOL_BALANCE = env_config.MIN_SOL_BALANCE * LAMPORTS_PER_SOL;
const SLIPPAGE_BPS = env_config.MAX_SLIPPAGE_BPS;

const EXCLUDE_ISOLATED_BANKS = env_config.EXCLUDE_ISOLATED_BANKS;

function getDebugLogger(context: string) {
  return require("debug")(`mfi:liquidator:${context}`);
}

class Liquidator {
  private bankMetadataMap: BankMetadataMap;
  private accountCooldowns: Map<string, number> = new Map();
  accountInfos: Map<PublicKey, MarginfiAccountWrapper> = new Map();
  accountKeys: PublicKey[] = [];

  constructor(
    readonly connection: Connection,
    readonly account: MarginfiAccountWrapper,
    readonly client: MarginfiClient,
    readonly wallet: NodeWallet,
    readonly account_whitelist: PublicKey[] | undefined,
    readonly account_blacklist: PublicKey[] | undefined
  ) {
    this.bankMetadataMap = {};
  }

  async start() {
    console.log("Starting liquidator");

    console.log("Wallet: %s", this.account.authority);
    console.log("Liquidator account: %s", this.account.address);
    console.log("Program id: %s", this.client.program.programId);
    console.log("Group: %s", this.client.groupAddress);
    if (this.account_blacklist) {
      console.log("Blacklist: %s", this.account_blacklist);
    }
    if (this.account_whitelist) {
      console.log("Whitelist: %s", this.account_whitelist);
    }

    this.bankMetadataMap = await loadBankMetadatas();

    setInterval(async () => {
      try {
        this.bankMetadataMap = await loadBankMetadatas();
      } catch (e) {
        console.error("Failed to refresh bank metadata");
      }
    }, 10 * 60 * 1000); // refresh cache every 10 minutes

    setInterval(() => this.printAccountValue(), 30 * 1000);

    this.printAccountValue();

    console.log("Liquidating on %s banks", this.client.banks.size);

    console.log("Start with DEBUG=mfi:* to see more logs");

    try {
      while (await this.rebalanceIfNeeded()) {}
    } catch (e) {
      console.error("Error during initial rebalance: ", e);
    }

    await this.startLiquidatorDataLoader();
    await this.mainLoop();
  }

  private async printAccountValue() {
    try {
      const { assets, liabilities } = await this.account.computeHealthComponentsWithoutBias(
        MarginRequirementType.Equity
      );
      const accountValue = assets.minus(liabilities);
      console.log("Account Value: $%s", accountValue);
    } catch (e) {
      console.error("Failed to fetch account value %s", e);
    }
  }

  private async reload() {
    await this.client.reload();
    await this.account.reload();
  }

  private async rebalanceIfNeeded(): Promise<boolean> {
    if (await this.needsToBeRebalanced()) {
      await this.rebalancingStage();

      return true;
    }

    return false;
  }

  private async mainLoop() {
    const debug = getDebugLogger("main-loop");
    drawSpinner("Scanning");
    while (true) {
      try {
        this.reload();
        while (true) {
          await this.swapNonUsdcInTokenAccounts();
          debug("Started main loop iteration");
          if (await this.rebalanceIfNeeded()) {
            continue;
          }

          // Don't sleep after liquidating an account, start rebalance immediately
          if (!(await this.liquidationStage())) {
            await sleep(env_config.SLEEP_INTERVAL_SECONDS * 1000);
            this.reload();
          }
        }
      } catch (e) {
        console.error(e);
        captureException(e);
        await sleep(env_config.SLEEP_INTERVAL_SECONDS * 1000);
      }
    }
  }

  private async swap(mintIn: PublicKey, mintOut: PublicKey, amount: BN, swapModeExactOut: boolean = false) {
    const debug = getDebugLogger("swap");

    if (!swapModeExactOut) {
      const mintInBank = this.client.getBankByMint(mintIn)!;
      const mintOutBank = this.client.getBankByMint(mintOut)!;
      const mintInSymbol = this.getTokenSymbol(mintInBank);
      const mintOutSymbol = this.getTokenSymbol(mintOutBank);
      const amountScaled = nativeToUi(amount, mintInBank.mintDecimals);
      console.log("Swapping %s %s to %s", amountScaled, mintInSymbol, mintOutSymbol);
    } else {
      const mintInBank = this.client.getBankByMint(mintIn)!;
      const mintOutBank = this.client.getBankByMint(mintOut)!;
      const mintInSymbol = this.getTokenSymbol(mintInBank);
      const mintOutSymbol = this.getTokenSymbol(mintOutBank);
      const amountScaled = nativeToUi(amount, mintOutBank.mintDecimals);
      console.log("Swapping %s to %s %s", mintInSymbol, amountScaled, mintOutSymbol);
    }

    const swapMode = swapModeExactOut ? "ExactOut" : "ExactIn";
    const swapUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${mintIn.toBase58()}&outputMint=${mintOut.toBase58()}&amount=${amount.toString()}&slippageBps=${SLIPPAGE_BPS}&swapMode=${swapMode}`;
    const quoteApiResponse = await fetch(swapUrl);
    const data = await quoteApiResponse.json();

    const transactionResponse = await (
      await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // quoteResponse from /quote api
          quoteResponse: data,
          // user public key to be used for the swap
          userPublicKey: this.wallet.publicKey.toString(),
          // auto wrap and unwrap SOL. default is true
          wrapUnwrapSOL: true,
          // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
          // feeAccount: "fee_account_public_key"
          computeUnitPriceMicroLamports: env_config.TX_FEE,
        }),
      })
    ).json();

    const { swapTransaction } = transactionResponse;

    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    transaction.sign([this.wallet.payer]);

    const rawTransaction = transaction.serialize();
    const txid = await this.connection.sendRawTransaction(rawTransaction, {
      maxRetries: 2,
    });

    await this.connection.confirmTransaction(txid, "confirmed");

    debug("Swap transaction sent: %s", txid);
  }

  private async startLiquidatorDataLoader() {
    const debug = getDebugLogger("start-liquidator-data-loader");
    debug("Starting liquidator data loader");

    // Start a job that periodically loads all marginfi account pubkeys, and then refreshes them in batches.
    // Start a websocket that updates the accounts.
    debug("Loading all Marginfi accounts for the first time");
    await this.loadAllMarginfiAccounts();
    debug("Starting websocket account updater");
    this.startWebsocketAccountUpdater();

    setInterval(async () => {
      debug("Refreshing all Marginfi accounts");
      await this.loadAllMarginfiAccounts();
    }, env_config.ACCOUNT_REFRESH_INTERVAL_SECONDS * 1000);
  }

  private async loadAllMarginfiAccounts() {
    console.log("Loading data, this may take a moment...");
    const debug = getDebugLogger("load-all-marginfi-accounts");
    debug("Loading all Marginfi accounts");
    let allKeys = [];

    // If whitelist is set, filter out all accounts that are not in the whitelist
    if (env_config.MARGINFI_ACCOUNT_WHITELIST) {
      allKeys = env_config.MARGINFI_ACCOUNT_WHITELIST;
    } else {
      allKeys = await this.client.getAllMarginfiAccountAddresses();
    }

    debug("Retrieved all Marginfi account addresses, found: %d", allKeys.length);
    const [slot, ais] = await chunkedGetRawMultipleAccountInfos(
      this.connection,
      allKeys.map((k) => k.toBase58()),
      16 * 64,
      64
    );
    debug("Received account information for slot %d, got: %d accounts", slot, ais.size);
    this.accountKeys = allKeys;

    const totalAccounts = ais.size;
    let processedAccounts = 0;
    for (const [key, accountInfo] of ais) {
      const pubkey = new PublicKey(key);
      const account = MarginfiAccountWrapper.fromAccountDataRaw(pubkey, this.client, accountInfo.data);
      this.accountInfos.set(pubkey, account);

      processedAccounts++;
      if (processedAccounts % 5000 === 0) {
        const progress = ((processedAccounts / totalAccounts) * 100).toFixed(2);
        debug("Processed %d accounts out of %d (%s%%)", processedAccounts, totalAccounts, progress);
      }
    }

    console.log("Finished loading all Marginfi accounts");
  }

  private async startWebsocketAccountUpdater() {
    const debug = getDebugLogger("start-websocket-account-updater");
    debug("Starting websocket account updater");
    /// Start a websocket that updates the accounts.
    let connection = 0;

    const fn = () => {
      if (connection != 0) {
        debug("Resetting websocket connection");
        this.connection.removeAccountChangeListener(connection);
      }

      debug("Starting websocket connection");
      connection = this.connection.onProgramAccountChange(this.client.program.programId, (info) => {
        const pubkey = info.accountId;
        const accountInfo = info.accountInfo;

        if (accountInfo.data.length !== this.client.program.account.marginfiAccount.size) {
          return;
        }

        try {
          const account = MarginfiAccountWrapper.fromAccountDataRaw(pubkey, this.client, accountInfo.data);
          this.accountInfos.set(pubkey, account);
        } catch (error) {
          debug("Failed to decode Marginfi account for public key: %s, Error: %s", pubkey.toBase58(), error);
        }
      });
    };

    setInterval(() => fn, env_config.WS_RESET_INTERVAL_SECONDS * 1000);
    fn();
  }

  /**
   * 1. step of the account re-balancing

   * Withdraw all non-usdc deposits from account and sell them to usdc.
   * This step will only withdraw up until the free collateral threshold, if some collateral is tied up the bot will deposit
   * in a later stage the borrowed liabilities and usdc to untie the remaining collateral.
   */
  private async sellNonUsdcDeposits() {
    const debug = getDebugLogger("sell-non-usdc-deposits");
    debug("Starting non-usdc deposit sell step (1/3)");
    let balancesWithNonUsdcDeposits = this.account.activeBalances
      .map((balance) => {
        let bank = this.client.getBankByPk(balance.bankPk)!;
        let priceInfo = this.client.getOraclePriceByBank(balance.bankPk)!;
        let { assets } = balance.computeQuantity(bank);

        return { assets, bank, priceInfo };
      })
      .filter(({ assets, bank }) => !bank.mint.equals(USDC_MINT));

    for (let { bank } of balancesWithNonUsdcDeposits) {
      const maxWithdrawAmount = this.account.computeMaxWithdrawForBank(bank.address);
      const balanceAssetAmount = nativeToUi(
        this.account.getBalance(bank.address).computeQuantity(bank).assets,
        bank.mintDecimals
      );
      const withdrawAmount = BigNumber.min(maxWithdrawAmount, balanceAssetAmount);

      debug("Balance: %d, max withdraw: %d", balanceAssetAmount, withdrawAmount);

      if (withdrawAmount.eq(0)) {
        debug("No untied %s to withdraw", this.getTokenSymbol(bank));
        continue;
      }

      debug("Withdrawing %d %s", withdrawAmount, this.getTokenSymbol(bank));
      let withdrawSig = await this.account.withdraw(
        withdrawAmount,
        bank.address,
        withdrawAmount.gte(balanceAssetAmount * 0.95)
      );

      debug("Withdraw tx: %s", withdrawSig);
      this.reload();
    }

    await this.swapNonUsdcInTokenAccounts();
  }

  /**
   * 2. step of the account re-balancing
   *
   * At this stage we assume that the lending account has not more untied non-usdc collateral.
   * Only usdc collateral and liabilities are left.
   *
   * We first calculate the cost of paying down the liability in usdc, if we don't have enough usdc in the token account,
   * we withdraw any additional usdc we need from the lending account.
   *
   * We then buy liability with the usdc we have available and deposit the usdc and liability to the lending account.
   *
   * Depositing the liability should unlock any tied up collateral.
   *
   */
  private async repayAllDebt() {
    const debug = getDebugLogger("repay-all-debt");
    debug("Starting debt repayment step (2/3)");
    const balancesWithNonUsdcLiabilities = this.account.activeBalances
      .map((balance) => {
        let bank = this.client.getBankByPk(balance.bankPk)!;
        let { liabilities } = balance.computeQuantity(bank);

        return { liabilities, bank };
      })
      .filter(({ liabilities, bank }) => liabilities.gt(new BigNumber(0)) && !bank.mint.equals(USDC_MINT));

    for (let { liabilities, bank } of balancesWithNonUsdcLiabilities) {
      debug("Repaying %d %s", nativeToUi(liabilities, bank.mintDecimals), this.getTokenSymbol(bank));
      let availableUsdcInTokenAccount = await this.getTokenAccountBalance(USDC_MINT);

      await this.client.reload();

      const usdcBank = this.client.getBankByMint(USDC_MINT)!;
      const priceInfo = this.client.getOraclePriceByBank(bank.address)!;
      const availableUsdcLiquidity = this.account.computeMaxBorrowForBank(usdcBank.address);

      const baseLiabUsdcValue = bank.computeLiabilityUsdValue(
        priceInfo,
        liabilities,
        MarginRequirementType.Equity,
        // We might need to use a Higher price bias to account for worst case scenario.
        PriceBias.Highest
      );

      /// When a liab value is super small (1 BONK), we cannot feasibly buy it for the exact amount,
      // so the solution is to buy more (trivial amount more), and then over repay.
      const liabUsdcValue = BigNumber.max(baseLiabUsdcValue, new BigNumber(1));

      debug(
        "Liab usd value %s, USDC in TA %d, USDC available: %d",
        liabUsdcValue,
        availableUsdcInTokenAccount,
        availableUsdcLiquidity
      );

      // We can possibly withdraw some usdc from the lending account if we are short.
      let usdcBuyingPower = BigNumber.min(availableUsdcInTokenAccount, liabUsdcValue);
      const missingUsdc = liabUsdcValue.minus(usdcBuyingPower);

      if (missingUsdc.gt(0)) {
        const usdcToWithdraw = BigNumber.min(missingUsdc, availableUsdcLiquidity);
        debug("Withdrawing %d USDC", usdcToWithdraw);
        const withdrawSig = await this.account.withdraw(usdcToWithdraw, usdcBank.address);
        debug("Withdraw tx: %s", withdrawSig);
        await this.account.reload();
      }

      availableUsdcInTokenAccount = await this.getTokenAccountBalance(USDC_MINT);

      usdcBuyingPower = BigNumber.min(availableUsdcInTokenAccount, liabUsdcValue);

      debug("Swapping %d USDC to %s", usdcBuyingPower, this.getTokenSymbol(bank));

      await this.swap(USDC_MINT, bank.mint, uiToNative(usdcBuyingPower, usdcBank.mintDecimals));

      const liabsUi = new BigNumber(nativeToUi(liabilities, bank.mintDecimals));
      const liabsTokenAccountUi = await this.getTokenAccountBalance(bank.mint, false);
      const liabsUiAmountToRepay = BigNumber.min(liabsTokenAccountUi, liabsUi);

      debug("Got %d %s (debt: %d), depositing to marginfi", liabsUiAmountToRepay, this.getTokenSymbol(bank), liabsUi);
      debug("Paying off %d %s liabilities", liabsUiAmountToRepay, this.getTokenSymbol(bank));

      const depositSig = await this.account.repay(
        liabsUiAmountToRepay,
        bank.address,
        liabsUiAmountToRepay.gte(liabsUi)
      );
      debug("Deposit tx: %s", depositSig);

      await this.reload();
    }
  }

  /**
   * 3. step of the account re-balancing
   *
   * At this stage we assume that the lending account has not more untied non-usdc collateral, and we have repaid all liabilities
   * given our current purchasing power.
   *
   * We can now deposit the remaining usdc in the lending account to untie the collateral.
   *
   * Assuming everything went well the account should be balanced now, however if that is not the case
   * the re-balancing mechanism will start again.
   */
  private async depositRemainingUsdc() {
    const debug = getDebugLogger("deposit-remaining-usdc");
    debug("Starting remaining usdc deposit step (3/3)");

    const usdcBalance = await this.getTokenAccountBalance(USDC_MINT);

    const usdcBank = this.client.getBankByMint(USDC_MINT)!;
    const depositTx = await this.account.deposit(usdcBalance, usdcBank.address);
    debug("Deposit tx: %s", depositTx);
  }

  private async rebalancingStage() {
    const debug = getDebugLogger("rebalancing-stage");
    debug("Starting rebalancing stage");
    await this.sellNonUsdcDeposits();
    await this.repayAllDebt();
    await this.depositRemainingUsdc();
  }

  private async getTokenAccountBalance(mint: PublicKey, ignoreNativeMint: boolean = false): Promise<BigNumber> {
    const debug = getDebugLogger("getTokenAccountBalances");
    const tokenAccount = await associatedAddress({ mint, owner: this.wallet.publicKey });

    debug!("Checking token account %s for %s", tokenAccount, mint);

    let nativeAmoutnUi = 0;

    if (mint.equals(NATIVE_MINT)) {
      let nativeAmount = await this.connection.getBalance(this.wallet.publicKey);
      nativeAmoutnUi = nativeToUi(Math.max(nativeAmount - MIN_SOL_BALANCE, 0), 9);

      debug("Native amount: %d", nativeAmoutnUi);
    }

    try {
      return new BigNumber((await this.connection.getTokenAccountBalance(tokenAccount)).value.uiAmount!).plus(
        nativeAmoutnUi
      );
    } catch (e) {
      return new BigNumber(0).plus(nativeAmoutnUi);
    }
  }

  private async swapNonUsdcInTokenAccounts2() {
    const debug = getDebugLogger("swap-non-usdc-in-token-accounts");
    debug("Swapping any remaining non-usdc to usdc");

    const banks = Array.from(this.client.banks.values()).filter((bank) => !bank.mint.equals(USDC_MINT));
    const usdcBank = this.client.getBankByMint(USDC_MINT)!;
  }

  private async swapNonUsdcInTokenAccounts() {
    const debug = getDebugLogger("swap-non-usdc-in-token-accounts");
    debug("Swapping any remaining non-usdc to usdc");
    const banks = this.client.banks.values();
    const usdcBank = this.client.getBankByMint(USDC_MINT)!;
    for (const bank of banks) {
      if (bank.mint.equals(USDC_MINT)) {
        continue;
      }

      let uiAmount = await this.getTokenAccountBalance(bank.mint, false);
      debug("Account has %d %s", uiAmount, this.getTokenSymbol(bank));
      let price = this.client.getOraclePriceByBank(bank.address)!;
      let usdValue = bank.computeUsdValue(price, new BigNumber(uiAmount), PriceBias.None, false, undefined, false);

      if (usdValue.lte(DUST_THRESHOLD_UI) || uiAmount.isNaN()) {
        // debug!("Not enough %s to swap, skipping...", this.getTokenSymbol(bank));
        continue;
      } else {
        debug("Account has %d ($%d) %s", uiAmount, usdValue, this.getTokenSymbol(bank));
      }

      const balance = this.account.getBalance(bank.address);
      const { liabilities } = balance.computeQuantityUi(bank);

      if (liabilities.gt(0)) {
        debug("Account has %d liabilities in %s", liabilities, this.getTokenSymbol(bank));
        const depositAmount = BigNumber.min(uiAmount, liabilities);

        debug("Paying off %d %s liabilities", depositAmount, this.getTokenSymbol(bank));
        await this.account.repay(depositAmount, bank.address, uiAmount.gte(liabilities));

        uiAmount = await this.getTokenAccountBalance(bank.mint);

        if (uiAmount.lte(DUST_THRESHOLD_UI)) {
          debug("Account has no more %s, skipping...", this.getTokenSymbol(bank));
          continue;
        }
      }

      debug("Swapping %d %s to USDC", uiAmount, this.getTokenSymbol(bank));

      await this.swap(bank.mint, USDC_MINT, uiToNative(uiAmount, bank.mintDecimals));
    }

    const usdcBalance = await this.getTokenAccountBalance(USDC_MINT);
    const { liabilities } = this.account.computeHealthComponentsWithoutBias(MarginRequirementType.Equity);

    if (usdcBalance.eq(0) || liabilities.gt(0)) {
      debug("No USDC to deposit");
      return;
    }

    debug("Depositing %d USDC", usdcBalance);

    const tx = await this.account.deposit(usdcBalance, usdcBank.address);

    debug("Deposit tx: %s", tx);

    await this.reload();
  }

  private async needsToBeRebalanced(): Promise<boolean> {
    const debug = getDebugLogger("rebalance-check");

    debug("Checking if liquidator needs to be rebalanced");
    await this.reload();

    const lendingAccountToRebalance = this.account.activeBalances
      .map((lendingAccount) => {
        const bank = this.client.getBankByPk(lendingAccount.bankPk)!;
        const { assets, liabilities } = lendingAccount.computeQuantity(bank);

        return { bank, assets, liabilities };
      })
      .filter(({ bank, assets, liabilities }) => {
        return (assets.gt(DUST_THRESHOLD) && !bank.mint.equals(USDC_MINT)) || liabilities.gt(new BigNumber(0));
      });

    const lendingAccountToRebalanceExists = lendingAccountToRebalance.length > 0;
    debug("Liquidator account needs to be rebalanced: %s", lendingAccountToRebalanceExists ? "true" : "false");

    if (lendingAccountToRebalanceExists) {
      debug("Lending accounts to rebalance:");
      lendingAccountToRebalance.forEach(({ bank, assets, liabilities }) => {
        debug(`Bank: ${this.getTokenSymbol(bank)}, Assets: ${assets}, Liabilities: ${liabilities} `);
      });
    }

    return lendingAccountToRebalanceExists;
  }

  private async liquidationStage(): Promise<boolean> {
    const debug = getDebugLogger("liquidation-stage");
    debug("Started liquidation stage");
    const allAccounts = Array.from(this.accountInfos.values());
    const targetAccounts = allAccounts.filter((account) => {
      if (this.account_whitelist) {
        return (
          this.account_whitelist.find((whitelistedAddress) => whitelistedAddress.equals(account.address)) !== undefined
        );
      } else if (this.account_blacklist) {
        return (
          this.account_blacklist.find((whitelistedAddress) => whitelistedAddress.equals(account.address)) === undefined
        );
      }
      return true;
    });

    let accounts = [];

    if (env_config.SORT_ACCOUNTS_MODE) {
      accounts = this.sortByLiquidationAmount(targetAccounts);
    } else {
      accounts = shuffle(targetAccounts);
    }

    debug("Found %s accounts in total", allAccounts.length);
    debug("Monitoring %s accounts", targetAccounts.length);

    for (let i = 0; i < accounts.length; i++) {
      const liquidatedAccount = await this.processAccount(accounts[i]);

      debug("Account %s liquidated: %s", accounts[i], liquidatedAccount);

      if (liquidatedAccount) {
        debug("Account liquidated, stopping to rebalance");
        return true;
      }
    }

    return false;
  }

  private async processAccount(marginfiAccount: MarginfiAccountWrapper): Promise<boolean> {
    const group = this.client.group;
    const liquidatorAccount = this.account;

    if (marginfiAccount.address.equals(liquidatorAccount.address)) {
      return false;
    }

    const debug = getDebugLogger(`process-account:${marginfiAccount.address.toBase58()}`);

    debug("Processing account %s", marginfiAccount.address);

    if (marginfiAccount.canBeLiquidated()) {
      const { assets, liabilities } = marginfiAccount.computeHealthComponents(MarginRequirementType.Maintenance);

      const maxLiabilityPaydown = assets.minus(liabilities);
      debug("Account can be liquidated, account health: %d", maxLiabilityPaydown);
    } else {
      debug("Account cannot be liquidated");
      return false;
    }

    captureMessage(`Liquidating account ${marginfiAccount.address.toBase58()}`);

    let maxLiabilityPaydownUsdValue = new BigNumber(0);
    let bestLiabAccountIndex = 0;

    // Find the biggest liability account that can be covered by liquidator
    for (let i = 0; i < marginfiAccount.activeBalances.length; i++) {
      const balance = marginfiAccount.activeBalances[i];
      const bank = this.client.getBankByPk(balance.bankPk)!;
      const priceInfo = this.client.getOraclePriceByBank(balance.bankPk)!;

      if (EXCLUDE_ISOLATED_BANKS && bank.config.assetWeightInit.isEqualTo(0)) {
        debug("Skipping isolated bank %s", this.getTokenSymbol(bank));
        continue;
      }

      const maxLiabCoverage = liquidatorAccount.computeMaxBorrowForBank(bank.address);
      const liquidatorLiabPayoffCapacityUsd = bank.computeUsdValue(
        priceInfo,
        maxLiabCoverage,
        PriceBias.None,
        false,
        undefined,
        false
      );
      debug("Max borrow for bank: %d ($%d)", maxLiabCoverage, liquidatorLiabPayoffCapacityUsd);
      const { liabilities: liquidateeLiabUsdValue } = balance.computeUsdValue(
        bank,
        priceInfo,
        MarginRequirementType.Equity
      );

      debug("Balance: liab: $%d, max coverage: %d", liquidateeLiabUsdValue, liquidatorLiabPayoffCapacityUsd);

      if (liquidateeLiabUsdValue.gt(maxLiabilityPaydownUsdValue)) {
        maxLiabilityPaydownUsdValue = liquidateeLiabUsdValue;
        bestLiabAccountIndex = i;
      }
    }

    debug(
      "Biggest liability balance paydown USD value: %d, mint: %s",
      maxLiabilityPaydownUsdValue,
      this.client.getBankByPk(marginfiAccount.activeBalances[bestLiabAccountIndex].bankPk)!.mint
    );

    if (maxLiabilityPaydownUsdValue.lt(MIN_LIQUIDATION_AMOUNT_USD_UI)) {
      debug("No liability to liquidate");
      return false;
    }

    let maxCollateralUsd = new BigNumber(0);
    let bestCollateralIndex = 0;

    // Find the biggest collateral account
    for (let i = 0; i < marginfiAccount.activeBalances.length; i++) {
      const balance = marginfiAccount.activeBalances[i];
      const bank = this.client.getBankByPk(balance.bankPk)!;
      const priceInfo = this.client.getOraclePriceByBank(balance.bankPk)!;

      if (EXCLUDE_ISOLATED_BANKS && bank.config.assetWeightInit.isEqualTo(0)) {
        debug("Skipping isolated bank %s", this.getTokenSymbol(bank));
        continue;
      }

      const { assets: collateralUsdValue } = balance.computeUsdValue(bank, priceInfo, MarginRequirementType.Equity);
      if (collateralUsdValue.gt(maxCollateralUsd)) {
        maxCollateralUsd = collateralUsdValue;
        bestCollateralIndex = i;
      }
    }

    debug(
      "Max collateral $%d, mint: %s",
      maxCollateralUsd,
      this.client.getBankByPk(marginfiAccount.activeBalances[bestCollateralIndex].bankPk)!.mint
    );

    const collateralBankPk = marginfiAccount.activeBalances[bestCollateralIndex].bankPk;
    const collateralBank = this.client.getBankByPk(collateralBankPk)!;
    const collateralPriceInfo = this.client.getOraclePriceByBank(collateralBankPk)!;

    const liabBankPk = marginfiAccount.activeBalances[bestLiabAccountIndex].bankPk;
    const liabBank = this.client.getBankByPk(liabBankPk)!;
    const liabPriceInfo = this.client.getOraclePriceByBank(liabBankPk)!;

    // MAX collateral amount to liquidate for given banks and the trader marginfi account balances
    // this doesn't account for liquidators liquidation capacity
    const maxCollateralAmountToLiquidate = marginfiAccount.computeMaxLiquidatableAssetAmount(
      collateralBank.address,
      liabBank.address
    );

    // MAX collateral amount to liquidate given liquidators current margin account
    const liquidatorMaxLiquidationCapacityLiabAmount = liquidatorAccount.computeMaxBorrowForBank(liabBank.address);
    const liquidatorMaxLiquidationCapacityUsd = liabBank.computeUsdValue(
      liabPriceInfo,
      liquidatorMaxLiquidationCapacityLiabAmount,
      PriceBias.None,
      true,
      undefined,
      false
    );
    const liquidatorMaxLiqCapacityAssetAmount = collateralBank.computeQuantityFromUsdValue(
      collateralPriceInfo,
      liquidatorMaxLiquidationCapacityUsd,
      PriceBias.None,
      true
    );

    debug(
      "Liquidator max liquidation capacity: %d ($%d) for bank %s",
      liquidatorMaxLiquidationCapacityLiabAmount,
      liquidatorMaxLiquidationCapacityUsd,
      liabBank.mint
    );

    debug("Collateral amount to liquidate: %d for bank %s", maxCollateralAmountToLiquidate, collateralBank.mint);

    const collateralAmountToLiquidate = BigNumber.min(
      maxCollateralAmountToLiquidate,
      liquidatorMaxLiqCapacityAssetAmount
    );

    const slippageAdjustedCollateralAmountToLiquidate = collateralAmountToLiquidate.times(0.9);

    const collateralUsdValue = collateralBank.computeUsdValue(
      collateralPriceInfo,
      new BigNumber(uiToNative(slippageAdjustedCollateralAmountToLiquidate, collateralBank.mintDecimals).toNumber()),
      PriceBias.None,
      false
    );

    if (collateralUsdValue.lt(MIN_LIQUIDATION_AMOUNT_USD_UI)) {
      debug("Collateral amount to liquidate is too small: $%d", collateralUsdValue);
      return false;
    }

    console.log(
      "Liquidating %d ($%d) %s for %s, account: %s",
      slippageAdjustedCollateralAmountToLiquidate.toFixed(6),
      collateralUsdValue.toFixed(3),
      this.getTokenSymbol(collateralBank),
      this.getTokenSymbol(liabBank),
      marginfiAccount.address.toBase58()
    );

    try {
      const sig = await liquidatorAccount.lendingAccountLiquidate(
        marginfiAccount.data,
        collateralBank.address,
        slippageAdjustedCollateralAmountToLiquidate,
        liabBank.address
      );

      console.log("Liquidation tx: %s", sig);
    } catch (e) {
      console.error("Failed to liquidate account %s", marginfiAccount.address.toBase58());
      console.error(e);

      this.addAccountToCoolDown(marginfiAccount.address);

      return false;
    }

    return true;
  }

  isAccountInCoolDown(address: PublicKey): boolean {
    const cooldown = this.accountCooldowns.get(address.toBase58());
    if (!cooldown) {
      return false;
    }

    return cooldown > Date.now();
  }

  addAccountToCoolDown(address: PublicKey) {
    const debug = getDebugLogger("add-account-to-cooldown");
    debug("Adding account %s to cooldown for %d seconds", address.toBase58(), env_config.ACCOUNT_COOL_DOWN_SECONDS);
    this.accountCooldowns.set(address.toBase58(), Date.now() + env_config.ACCOUNT_COOL_DOWN_SECONDS * 1000);
  }

  sortByLiquidationAmount(accounts: MarginfiAccountWrapper[]): MarginfiAccountWrapper[] {
    return accounts
      .filter((a) => a.canBeLiquidated())
      .filter((a) => !this.isAccountInCoolDown(a.address))
      .sort((a, b) => {
        const { assets: aAssets, liabilities: aLiabilities } = a.computeHealthComponents(
          MarginRequirementType.Maintenance
        );
        const { assets: bAssets, liabilities: bLiabilities } = b.computeHealthComponents(
          MarginRequirementType.Maintenance
        );

        const aMaxLiabilityPaydown = aAssets.minus(aLiabilities);
        const bMaxLiabilityPaydown = bAssets.minus(bLiabilities);

        return aMaxLiabilityPaydown.comparedTo(bMaxLiabilityPaydown);
      });
  }

  getTokenSymbol(bank: Bank): string {
    const bankMetadata = this.bankMetadataMap[bank.address.toBase58()];
    if (!bankMetadata) {
      console.log("Bank metadata not found for %s", bank.address.toBase58());
      return shortenAddress(bank.mint.toBase58());
    }

    return bankMetadata.tokenSymbol;
  }
}

const shuffle = ([...arr]) => {
  let m = arr.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
};

export { Liquidator };

function drawSpinner(message: string) {
  if (!!process.env.DEBUG) {
    // Don't draw spinner when logging is enabled
    return;
  }
  const spinnerFrames = ["-", "\\", "|", "/"];
  let frameIndex = 0;

  setInterval(() => {
    process.stdout.write(`\r${message} ${spinnerFrames[frameIndex]}`);
    frameIndex = (frameIndex + 1) % spinnerFrames.length;
  }, 100);
}

function nativeToBigNumber(amount: BN): BigNumber {
  return new BigNumber(amount.toString());
}
