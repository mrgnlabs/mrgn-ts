import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  MarginfiAccount,
  MarginfiClient,
  MarginRequirementType,
  PriceBias,
  USDC_DECIMALS,
} from "@mrgnlabs/marginfi-client-v2";
import { nativeToUi, NodeWallet, sleep, uiToNative } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
import { NATIVE_MINT } from "@solana/spl-token";
import { Jupiter } from "@jup-ag/core";
import { parseEnvConfig } from "./config";
import JSBI from "jsbi";
import BN from "bn.js";
import { getLogger, getTracer } from "./utils/logger";
import { Span } from "@opentelemetry/api";

const env_config = parseEnvConfig();

const DUST_THRESHOLD = new BigNumber(10).pow(USDC_DECIMALS - 2);
const DUST_THRESHOLD_UI = new BigNumber(0.1);
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MIN_SOL_BALANCE = env_config.MIN_SOL_BALANCE * LAMPORTS_PER_SOL;
const SLIPPAGE_BPS = 250;

class Liquidator {
  private readonly logger = getLogger();
  private readonly tracer = getTracer();

  constructor(
    readonly connection: Connection,
    readonly account: MarginfiAccount,
    readonly client: MarginfiClient,
    readonly wallet: NodeWallet,
    readonly jupiter: Jupiter,
    readonly account_whitelist: PublicKey[] | undefined,
    readonly account_blacklist: PublicKey[] | undefined,
  ) {
  }

  get group() {
    return this.client.group;
  }

  async start() {
    try {
      await this.tracer.startActiveSpan("startup-stage", async (span: Span) => {
        this.logger.info("Starting liquidator");
        this.logger.info(`Wallet: ${this.account.authority}`);
        this.logger.info(`Liquidator account: ${this.account.publicKey}`);
        this.logger.info(`Program id: ${this.client.program.programId}`);
        this.logger.info(`Group: ${this.group.publicKey}`);
        if (this.account_blacklist) {
          this.logger.info(`Blacklist: ${this.account_blacklist}`);
        }
        if (this.account_whitelist) {
          this.logger.info(`Whitelist: ${this.account_whitelist}`);
        }
        this.logger.info(`Liquidating on ${this.group.banks.size} banks`);

        await this.swapNonUsdcInTokenAccounts();

        span.end();
      });

      await this.mainLoop();
    } catch (e) {
      this.logger.error("Exception in liquidator main loop");
      this.logger.error(e);

      await sleep(env_config.SLEEP_INTERVAL);
      await this.mainLoop();
    }
  }

  private async mainLoop() {
    while (true) {
      this.logger.debug("Started main loop");
      if (await this.needsToBeRebalanced()) {
        await this.tracer.startActiveSpan("rebalancing-stage", async (span: Span) => {
          await this.rebalancingStage();
          span.end();
        });
        continue;
      }

      await this.liquidationStage();
    }
  }

  private async swap(mintIn: PublicKey, mintOut: PublicKey, amountIn: BN) {
    await this.tracer.startActiveSpan("swap", async (span: Span) => {
      this.logger.info(`Swapping ${amountIn} ${mintIn} to ${mintOut}`);

      const { routesInfos } = await this.jupiter.computeRoutes({
        inputMint: mintIn,
        outputMint: mintOut,
        amount: JSBI.BigInt(amountIn.toString()),
        slippageBps: SLIPPAGE_BPS,
      });

      const route = routesInfos[0];

      const { execute } = await this.jupiter.exchange({ routeInfo: route });

      const result: any = await execute();

      if (result.error) {
        this.logger.error(result.error);
        span.end();
        throw new Error(result.error);
      }
      this.logger.info(`Trade successful ${result.txid}`);
      span.end();
    });
  }

  /**
   * 1. step of the account re-balancing

   * Withdraw all non-usdc deposits from account and sell them to usdc.
   * This step will only withdraw up until the free collateral threshold, if some collateral is tied up the bot will deposit
   * in a later stage the borrowed liabilities and usdc to untie the remaining collateral.
   */
  private async sellNonUsdcDeposits() {
    this.logger.info("Starting non-usdc deposit sell step (1/3)");
    let balancesWithNonUsdcDeposits = this.account.activeBalances
      .map((balance) => {
        let bank = this.group.getBankByPk(balance.bankPk)!;
        let { assets } = balance.getQuantity(bank);

        return { assets, bank };
      })
      .filter(({ assets, bank }) => !bank.mint.equals(USDC_MINT) && assets.gt(DUST_THRESHOLD));

    for (let { bank } of balancesWithNonUsdcDeposits) {
      let maxWithdrawAmount = this.account.getMaxWithdrawForBank(bank);

      if (maxWithdrawAmount.eq(0)) {
        this.logger.info(`No untied ${bank.label} to withdraw`);
        continue;
      }

      this.logger.info(`Withdrawing ${maxWithdrawAmount} ${bank.label}`);
      let withdrawSig = await this.account.withdraw(maxWithdrawAmount, bank);

      this.logger.info(`Withdraw tx: ${withdrawSig}`);

      await this.account.reload();

      this.logger.info(`Swapping ${bank.mint} to USDC`);

      const balance = await this.getTokenAccountBalance(bank.mint);

      await this.swap(bank.mint, USDC_MINT, uiToNative(balance, bank.mintDecimals));
    }
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
    this.logger.info("Starting debt repayment step (2/3)");
    const balancesWithNonUsdcLiabilities = this.account.activeBalances
      .map((balance) => {
        let bank = this.group.getBankByPk(balance.bankPk)!;
        let { liabilities } = balance.getQuantity(bank);

        return { liabilities, bank };
      })
      .filter(({ liabilities, bank }) => liabilities.gt(DUST_THRESHOLD) && !bank.mint.equals(USDC_MINT));

    for (let { liabilities, bank } of balancesWithNonUsdcLiabilities) {
      this.logger.info(`Repaying ${nativeToUi(liabilities, bank.mintDecimals)} ${bank.label}`);
      let availableUsdcInTokenAccount = await this.getTokenAccountBalance(USDC_MINT);

      await this.group.reload();
      const usdcBank = this.group.getBankByMint(USDC_MINT)!;
      await usdcBank.reloadPriceData(this.connection);
      const availableUsdcLiquidity = this.account.getMaxBorrowForBank(usdcBank);

      await bank.reloadPriceData(this.connection);
      const liabUsdcValue = bank.getLiabilityUsdValue(
        liabilities,
        MarginRequirementType.Equity,
        // We might need to use a Higher price bias to account for worst case scenario.
        PriceBias.None,
      );

      // We can possibly withdraw some usdc from the lending account if we are short.
      let usdcBuyingPower = BigNumber.min(availableUsdcInTokenAccount, liabUsdcValue);
      const missingUsdc = liabUsdcValue.minus(usdcBuyingPower);

      if (missingUsdc.gt(0)) {
        const usdcToWithdraw = BigNumber.min(missingUsdc, availableUsdcLiquidity);
        this.logger.info(`Withdrawing ${usdcToWithdraw} USDC`);
        const withdrawSig = await this.account.withdraw(usdcToWithdraw, usdcBank);
        this.logger.info(`Withdraw tx: ${withdrawSig}`);
        await this.account.reload();
      }

      availableUsdcInTokenAccount = await this.getTokenAccountBalance(USDC_MINT);

      usdcBuyingPower = BigNumber.min(availableUsdcInTokenAccount, liabUsdcValue);

      this.logger.info(`Swapping ${usdcBuyingPower} USDC to ${bank.label}`);

      await this.swap(USDC_MINT, bank.mint, uiToNative(usdcBuyingPower, USDC_DECIMALS));

      const liabBalance = BigNumber.min(
        await this.getTokenAccountBalance(bank.mint, true),
        new BigNumber(nativeToUi(liabilities, bank.mintDecimals)),
      );

      this.logger.info(`Got ${liabBalance} of ${bank.mint}, depositing to marginfi`);

      const depositSig = await this.account.repay(liabBalance, bank, liabBalance.gte(liabilities));
      this.logger.info(`Deposit tx: ${depositSig}`);
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
    this.logger.info("Starting remaining usdc deposit step (3/3)");

    const usdcBalance = await this.getTokenAccountBalance(USDC_MINT);

    const usdcBank = this.group.getBankByMint(USDC_MINT)!;
    const depositTx = await this.account.deposit(usdcBalance, usdcBank);
    this.logger.info(`Deposit tx: ${depositTx}`);
  }

  private async rebalancingStage() {
    this.logger.info("Starting rebalancing stage");
    await this.tracer.startActiveSpan("sell-non-usdc-deposits", async (span: Span) => {
      await this.sellNonUsdcDeposits();
      span.end();
    });
    await this.tracer.startActiveSpan("repay-all-debt", async (span: Span) => {
      await this.repayAllDebt();
      span.end();
    });
    await this.tracer.startActiveSpan("deposit-remaining-usdc", async (span: Span) => {
      await this.depositRemainingUsdc();
      span.end();
    });
  }

  private async getTokenAccountBalance(mint: PublicKey, ignoreNativeMint: boolean = false): Promise<BigNumber> {
    const tokenAccount = await associatedAddress({ mint, owner: this.wallet.publicKey });
    const nativeAmount = nativeToUi(
      mint.equals(NATIVE_MINT)
        ? Math.max(
          (await this.connection.getBalance(this.wallet.publicKey)) -
          (ignoreNativeMint ? MIN_SOL_BALANCE / 2 : MIN_SOL_BALANCE),
          0,
        )
        : 0,
      9,
    );

    try {
      return new BigNumber((await this.connection.getTokenAccountBalance(tokenAccount)).value.uiAmount!).plus(
        nativeAmount,
      );
    } catch (e) {
      return new BigNumber(0).plus(nativeAmount);
    }
  }

  private async swapNonUsdcInTokenAccounts() {
    this.logger.info("Swapping any remaining non-usdc to usdc");
    const banks = this.group.banks.values();
    for (let bankInterEntry = banks.next(); !bankInterEntry.done; bankInterEntry = banks.next()) {
      const bank = bankInterEntry.value;
      if (bank.mint.equals(USDC_MINT) || bank.mint.equals(NATIVE_MINT)) {
        continue;
      }

      let amount = await this.getTokenAccountBalance(bank.mint);

      if (amount.lte(DUST_THRESHOLD_UI)) {
        continue;
      }

      const balance = this.account.getBalance(bank.publicKey);
      const { liabilities } = balance.getQuantityUi(bank);

      if (liabilities.gt(0)) {
        this.logger.info(`Account has ${liabilities} liabilities in ${bank.label}`);
        const depositAmount = BigNumber.min(amount, liabilities);

        this.logger.info(`Paying off ${depositAmount} ${bank.label} liabilities`);
        await this.account.repay(depositAmount, bank, amount.gte(liabilities));

        amount = await this.getTokenAccountBalance(bank.mint);
      }

      this.logger.info(`Swapping ${amount} ${bank.label} to USDC`);

      await this.swap(bank.mint, USDC_MINT, uiToNative(amount, bank.mintDecimals));
    }

    const usdcBalance = await this.getTokenAccountBalance(USDC_MINT);

    if (usdcBalance.eq(0)) {
      this.logger.info("No USDC to deposit");
      return;
    }

    this.logger.info(`Depositing ${usdcBalance} USDC`);

    const tx = await this.account.deposit(usdcBalance, this.group.getBankByMint(USDC_MINT)!);

    this.logger.info(`Deposit tx: ${tx}`);
  }

  private async needsToBeRebalanced(): Promise<boolean> {
    this.logger.debug("Checking if liquidator needs to be rebalanced");
    await this.group.reload();
    await this.account.reload();

    const lendingAccountToRebalance = this.account.activeBalances
      .map((lendingAccount) => {
        const bank = this.group.getBankByPk(lendingAccount.bankPk)!;
        const { assets, liabilities } = lendingAccount.getQuantity(bank);

        return { bank, assets, liabilities };
      })
      .filter(({ bank, assets, liabilities }) => {
        return (assets.gt(DUST_THRESHOLD) && !bank.mint.equals(USDC_MINT)) || liabilities.gt(DUST_THRESHOLD);
      });

    const lendingAccountToRebalanceExists = lendingAccountToRebalance.length > 0;
    this.logger.info(`Liquidator account needs to be rebalanced: ${lendingAccountToRebalanceExists}`);

    if (lendingAccountToRebalanceExists) {
      this.logger.info("Lending accounts to rebalance:");
      lendingAccountToRebalance.forEach(({ bank, assets, liabilities }) => {
        this.logger.info(`Bank: ${bank.label}, Assets: ${assets}, Liabilities: ${liabilities}`);
      });
    }

    return lendingAccountToRebalanceExists;
  }

  private async liquidationStage() {
    this.logger.debug("Started liquidation stage");
    const allAccounts = await this.client.getAllMarginfiAccountAddresses();
    const targetAccounts = allAccounts.filter((address) => {
      if (this.account_whitelist) {
        return this.account_whitelist.find((whitelistedAddress) => whitelistedAddress.equals(address)) !== undefined;
      } else if (this.account_blacklist) {
        return this.account_blacklist.find((whitelistedAddress) => whitelistedAddress.equals(address)) === undefined;
      }
      throw new Error("Uh uh. Either account whitelist or blacklist should have been provided.");
    });
    const addresses = shuffle(targetAccounts);
    this.logger.debug(`Found ${allAccounts.length} accounts in total`);
    this.logger.debug(`Monitoring ${targetAccounts.length} accounts`);

    for (let i = 0; i < addresses.length; i++) {
      const isAccountLiquidated = await this.processAccount(addresses[i]);

      this.logger.info(`Account ${addresses[i]} liquidated: ${isAccountLiquidated}`);

      if (isAccountLiquidated) {
        this.logger.info("Account liquidated, stopping to rebalance");
        break;
      }
    }
  }

  private async processAccount(account: PublicKey): Promise<boolean> {
    const client = this.client;

    if (account.equals(this.account.publicKey)) {
      return false;
    }

    this.logger.info(`Processing account ${account}`);

    const marginfiAccount = await MarginfiAccount.fetch(account, client);
    if (!marginfiAccount.canBeLiquidated()) {
      this.logger.info("Account cannot be liquidated");
      return false;
    } else {
      const { assets, liabilities } = marginfiAccount.getHealthComponents(MarginRequirementType.Maint);

      const maxLiabilityPaydown = assets.minus(liabilities);
      this.logger.info(`Account can be liquidated, account health: ${maxLiabilityPaydown}`);
    }

    return this.tracer.startActiveSpan(
      "liquidate-account",
      {
        attributes: {
          account: marginfiAccount.publicKey.toBase58(),
          authority: marginfiAccount.authority.toBase58(),
        },
      },
      async (span: Span) => {
        const isAccountLiquidated = await this.liquidateAccount(marginfiAccount);
        span.end();
        return isAccountLiquidated;
      },
    );
  }

  private async liquidateAccount(liquidateeMarginfiAccount: MarginfiAccount): Promise<boolean> {
    this.logger.info(`Liquidating account ${liquidateeMarginfiAccount.publicKey}`);

    let maxLiabilityPaydownUsdValue = new BigNumber(0);
    let bestLiabAccountIndex = 0;

    const liquidatorAccount = this.account;
    const group = liquidateeMarginfiAccount.group;

    // Find the biggest liability account that can be covered by liquidator
    for (let i = 0; i < liquidateeMarginfiAccount.activeBalances.length; i++) {
      const balance = liquidateeMarginfiAccount.activeBalances[i];
      const bank = group.getBankByPk(balance.bankPk)!;
      const maxLiabCoverage = liquidatorAccount.getMaxBorrowForBank(bank);
      const liquidatorLiabPayoffCapacityUsd = bank.getUsdValue(maxLiabCoverage, PriceBias.None, undefined, false);
      this.logger.info(`Max borrow for bank: ${maxLiabCoverage} ($${liquidatorLiabPayoffCapacityUsd})`);
      const { liabilities: liquidateeLiabUsdValue } = balance.getUsdValue(bank, MarginRequirementType.Equity);

      this.logger.info(`Balance: liab: $${liquidateeLiabUsdValue}, max coverage: ${liquidatorLiabPayoffCapacityUsd}`);

      if (liquidateeLiabUsdValue.gt(maxLiabilityPaydownUsdValue)) {
        maxLiabilityPaydownUsdValue = liquidateeLiabUsdValue;
        bestLiabAccountIndex = i;
      }
    }

    this.logger.info(
      `Biggest liability balance paydown USD value: ${maxLiabilityPaydownUsdValue}, mint: ${
        group.getBankByPk(liquidateeMarginfiAccount.activeBalances[bestLiabAccountIndex].bankPk)!.mint
      }`,
    );

    if (maxLiabilityPaydownUsdValue.lt(DUST_THRESHOLD_UI)) {
      this.logger.info("No liability to liquidate");
      return false;
    }

    let maxCollateralUsd = new BigNumber(0);
    let bestCollateralIndex = 0;

    // Find the biggest collateral account
    for (let i = 0; i < liquidateeMarginfiAccount.activeBalances.length; i++) {
      const balance = liquidateeMarginfiAccount.activeBalances[i];
      const bank = group.getBankByPk(balance.bankPk)!;

      const { assets: collateralUsdValue } = balance.getUsdValue(bank, MarginRequirementType.Equity);
      if (collateralUsdValue.gt(maxCollateralUsd)) {
        maxCollateralUsd = collateralUsdValue;
        bestCollateralIndex = i;
      }
    }

    this.logger.info(
      `Max collateral USD value: ${maxCollateralUsd}, mint: ${
        group.getBankByPk(liquidateeMarginfiAccount.activeBalances[bestCollateralIndex].bankPk)!.mint
      }`,
    );

    const collateralBankPk = liquidateeMarginfiAccount.activeBalances[bestCollateralIndex].bankPk;
    const collateralBank = group.getBankByPk(collateralBankPk)!;

    const liabBankPk = liquidateeMarginfiAccount.activeBalances[bestLiabAccountIndex].bankPk;
    const liabBank = group.getBankByPk(liabBankPk)!;

    // MAX collateral amount to liquidate for given banks and the trader marginfi account balances
    // this doesn't account for liquidators liquidation capacity
    const maxCollateralAmountToLiquidate = liquidateeMarginfiAccount.getMaxLiquidatableAssetAmount(
      collateralBank,
      liabBank,
    );

    this.logger.info(`Max collateral amount to liquidate: ${maxCollateralAmountToLiquidate}`);

    // MAX collateral amount to liquidate given liquidators current margin account
    const liquidatorMaxLiquidationCapacityLiabAmount = liquidatorAccount.getMaxBorrowForBank(liabBank);
    const liquidatorMaxLiquidationCapacityUsd = liabBank.getUsdValue(
      liquidatorMaxLiquidationCapacityLiabAmount,
      PriceBias.None,
      undefined,
      false,
    );
    const liquidatorMaxLiqCapacityAssetAmount = collateralBank.getQuantityFromUsdValue(
      liquidatorMaxLiquidationCapacityUsd,
      PriceBias.None,
    );

    this.logger.info(
      `Liquidator max liquidation capacity: ${liquidatorMaxLiquidationCapacityLiabAmount} ($${liquidatorMaxLiquidationCapacityUsd}) for bank ${liabBank.mint}`,
    );

    const collateralAmountToLiquidate = BigNumber.min(
      maxCollateralAmountToLiquidate,
      liquidatorMaxLiqCapacityAssetAmount,
    );

    const slippageAdjustedCollateralAmountToLiquidate = collateralAmountToLiquidate.times(0.95);

    if (slippageAdjustedCollateralAmountToLiquidate.lt(DUST_THRESHOLD_UI)) {
      this.logger.info("No collateral to liquidate");
      return false;
    }

    this.logger.info(
      `Liquidating ${slippageAdjustedCollateralAmountToLiquidate} ${collateralBank.label} for ${liabBank.label}`,
    );

    const sig = await liquidatorAccount.lendingAccountLiquidate(
      liquidateeMarginfiAccount,
      collateralBank,
      slippageAdjustedCollateralAmountToLiquidate,
      liabBank,
    );
    this.logger.info(`Liquidation tx: ${sig}`);

    return true;
  }
}

function shuffle<T>([...arr]: Iterable<T>): T[] {
  let m = arr.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
}

export { Liquidator };
