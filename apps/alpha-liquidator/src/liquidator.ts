import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  MarginfiAccount,
  MarginRequirementType,
  MarginfiClient,
  MarginfiGroup,
  USDC_DECIMALS,
  PriceBias,
} from "@mrgnlabs/marginfi-client-v2";
import { nativeToUi, NodeWallet, sleep, uiToNative } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
import { NATIVE_MINT } from "@solana/spl-token";
import { Jupiter, WRAPPED_SOL_MINT } from "@jup-ag/core";
import { captureMessage, caputreException, env_config } from "./config";
import JSBI from "jsbi";
import { wait } from "./utils/wait";
import BN from "bn.js";

const DUST_THRESHOLD = new BigNumber(10).pow(USDC_DECIMALS - 2);
const DUST_THRESHOLD_UI = new BigNumber(0.01);
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MIN_SOL_BALANCE = Number.parseFloat(env_config.MIN_SOL_BALANCE) * LAMPORTS_PER_SOL;
const SLIPPAGE_BPS = 250;

function getDebugLogger(context: string) {
  return require("debug")(`mfi:liquidator:${context}`);
}

class Liquidator {
  constructor(
    readonly connection: Connection,
    readonly account: MarginfiAccount,
    readonly group: MarginfiGroup,
    readonly client: MarginfiClient,
    readonly wallet: NodeWallet,
    readonly jupiter: Jupiter
  ) { }

  private async swap(mintIn: PublicKey, mintOut: PublicKey, amountIn: BN) {
    const debug = getDebugLogger("swap");

    debug("Swapping %s %s to %s", amountIn, mintIn.toBase58(), mintOut.toBase58());

    const { routesInfos } = await this.jupiter.computeRoutes({
      inputMint: mintIn,
      outputMint: mintOut,
      amount: JSBI.BigInt(amountIn.toString()),
      slippageBps: SLIPPAGE_BPS,
    });

    const route = routesInfos[0];

    const { execute } = await this.jupiter.exchange({ routeInfo: route });

    const result = await execute();

    // @ts-ignore
    if (result.error) {
      // @ts-ignore
      debug("Error: %s", result.error);
      // @ts-ignore
      throw new Error(result.error);
    }

    // @ts-ignore
    debug("Trade successful %s", result.txid);
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
        let bank = this.group.getBankByPk(balance.bankPk)!;
        let { assets } = balance.getQuantity(bank);

        return { assets, bank };
      })
      .filter(({ assets, bank }) => !bank.mint.equals(USDC_MINT) && assets.gt(DUST_THRESHOLD));

    for (let { bank } of balancesWithNonUsdcDeposits) {
      let maxWithdrawAmount = this.account.getMaxWithdrawForBank(bank);

      if (maxWithdrawAmount.eq(0)) {
        debug("No untied %s to withdraw", bank.label);
        continue;
      }

      debug("Withdrawing %d %s", maxWithdrawAmount, bank.label);
      let withdrawSig = await this.account.withdraw(maxWithdrawAmount, bank);

      debug("Withdraw tx: %s", withdrawSig);

      await this.account.reload();

      debug("Swapping %s to USDC", bank.mint);

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
    const debug = getDebugLogger("repay-all-debt");
    debug("Starting debt repayment step (2/3)");
    const balancesWithNonUsdcLiabilities = this.account.activeBalances
      .map((balance) => {
        let bank = this.group.getBankByPk(balance.bankPk)!;
        let { liabilities } = balance.getQuantity(bank);

        return { liabilities, bank };
      })
      .filter(({ liabilities, bank }) => liabilities.gt(DUST_THRESHOLD) && !bank.mint.equals(USDC_MINT));

    for (let { liabilities, bank } of balancesWithNonUsdcLiabilities) {
      debug("Repaying %d %s", nativeToUi(liabilities, bank.mintDecimals), bank.label);
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
        PriceBias.None
      );

      // We can possibly withdraw some usdc from the lending account if we are short.
      let usdcBuyingPower = BigNumber.min(availableUsdcInTokenAccount, liabUsdcValue);
      const missingUsdc = liabUsdcValue.minus(usdcBuyingPower);

      if (missingUsdc.gt(0)) {
        const usdcToWithdraw = BigNumber.min(missingUsdc, availableUsdcLiquidity);
        debug("Withdrawing %d USDC", usdcToWithdraw);
        const withdrawSig = await this.account.withdraw(usdcToWithdraw, usdcBank);
        debug("Withdraw tx: %s", withdrawSig);
        await this.account.reload();
      }

      availableUsdcInTokenAccount = await this.getTokenAccountBalance(USDC_MINT);

      usdcBuyingPower = BigNumber.min(availableUsdcInTokenAccount, liabUsdcValue);

      debug("Swapping %d USDC to %s", usdcBuyingPower, bank.label);

      await this.swap(USDC_MINT, bank.mint, uiToNative(usdcBuyingPower, USDC_DECIMALS));

      const liabBalance = BigNumber.min(
        await this.getTokenAccountBalance(bank.mint),
        new BigNumber(nativeToUi(liabilities, bank.mintDecimals))
      );

      debug("Got %s of %s, depositing to marginfi", liabBalance, bank.mint);

      const depositSig = await this.account.repay(liabBalance, bank, liabBalance.gte(liabilities));
      debug("Deposit tx: %s", depositSig);
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

    const usdcBank = this.group.getBankByMint(USDC_MINT)!;
    const depositTx = await this.account.deposit(usdcBalance, usdcBank);
    debug("Deposit tx: %s", depositTx);
  }

  private async rebalancingStage() {
    const debug = getDebugLogger("rebalancing-stage");
    debug("Starting rebalancing stage");
    captureMessage("Starting rebalancing stage");
    await this.sellNonUsdcDeposits();
    await this.repayAllDebt();
    await this.depositRemainingUsdc();
  }

  async start() {
    console.log("Starting liquidator");

    console.log("Liquidator account: %s", this.account.publicKey);
    console.log("Program id: %s", this.client.program.programId);
    console.log("Group: %s", this.group.publicKey);

    console.log("Liquidating on %s banks", this.group.banks.size);

    console.log("Start with DEBUG=mfi:* to see more logs");

    await this.mainLoop();
  }

  // Print out the top route from SOL to USDC.
  // Used for testing route data ingestion.
  private async testLoop() {
    while (true) {
      const bank = await this.account.client.group.getBankByMint(WRAPPED_SOL_MINT);
      if (!bank) {
        throw new Error("Bank not found");
      } else {
        const { routesInfos } = await this.jupiter.computeRoutes({
          inputMint: bank.mint,
          outputMint: USDC_MINT,
          amount: JSBI.BigInt(uiToNative(10, bank.mintDecimals).toString()),
          slippageBps: SLIPPAGE_BPS,
        });
        console.log(routesInfos[0]);
      }

      await wait(5000);
    }
  }

  private async mainLoop() {
    const debug = getDebugLogger("main-loop");
    try {
      await this.swapNonUsdcInTokenAccounts();
      while (true) {
        debug("Started main loop iteration");
        if (await this.needsToBeRebalanced()) {
          await this.rebalancingStage();
          continue;
        }

        await this.liquidationStage();
      }
    } catch (e) {
      console.error(e);

      caputreException(e);

      await sleep(env_config.SLEEP_INTERVAL);
      await this.mainLoop();
    }
  }

  private async getTokenAccountBalance(mint: PublicKey): Promise<BigNumber> {
    const tokenAccount = await associatedAddress({ mint, owner: this.wallet.publicKey });
    const nativeAmount = nativeToUi(
      mint.equals(NATIVE_MINT)
        ? Math.max((await this.connection.getBalance(this.wallet.publicKey)) - MIN_SOL_BALANCE, 0)
        : 0,
      9
    );

    try {
      return new BigNumber((await this.connection.getTokenAccountBalance(tokenAccount)).value.uiAmount!).plus(
        nativeAmount
      );
    } catch (e) {
      return new BigNumber(0).plus(nativeAmount);
    }
  }

  private async swapNonUsdcInTokenAccounts() {
    const debug = getDebugLogger("swap-non-usdc-in-token-accounts");
    debug("Swapping any remaining non-usdc to usdc");
    const banks = this.group.banks.values();
    for (let bankInterEntry = banks.next(); !bankInterEntry.done; bankInterEntry = banks.next()) {
      const bank = bankInterEntry.value;
      if (bank.mint.equals(USDC_MINT)) {
        continue;
      }

      let amount = await this.getTokenAccountBalance(bank.mint);

      if (amount.lte(DUST_THRESHOLD_UI)) {
        continue;
      }

      const balance = this.account.getBalance(bank.publicKey);
      const { liabilities } = balance.getQuantityUi(bank);

      if (liabilities.gt(0)) {
        debug("Account has %d liabilities in %s", liabilities, bank.label);
        const depositAmount = BigNumber.min(amount, liabilities);

        debug("Paying off %d %s liabilities", depositAmount, bank.label);
        await this.account.repay(depositAmount, bank, amount.gte(liabilities));

        amount = await this.getTokenAccountBalance(bank.mint);
      }

      debug("Swapping %d %s to USDC", amount, bank.label);

      await this.swap(bank.mint, USDC_MINT, uiToNative(amount, bank.mintDecimals));
    }

    const usdcBalance = await this.getTokenAccountBalance(USDC_MINT);

    if (usdcBalance.eq(0)) {
      debug("No USDC to deposit");
      return;
    }

    debug("Depositing %d USDC", usdcBalance);

    const tx = await this.account.deposit(usdcBalance, this.group.getBankByMint(USDC_MINT)!);

    debug("Deposit tx: %s", tx);
  }

  private async needsToBeRebalanced(): Promise<boolean> {
    const debug = getDebugLogger("rebalance-check");

    debug("Checking if liquidator needs to be rebalanced");
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
    debug("Liquidator account needs to be rebalanced: %s", lendingAccountToRebalanceExists ? "true" : "false");

    if (lendingAccountToRebalanceExists) {
      debug("Lending accounts to rebalance:");
      lendingAccountToRebalance.forEach(({ bank, assets, liabilities }) => {
        debug(`Bank: ${bank.label}, Assets: ${assets}, Liabilities: ${liabilities}`);
      });
    }

    return lendingAccountToRebalanceExists;
  }

  private async liquidationStage() {
    const debug = getDebugLogger("liquidation-stage");
    debug("Started liquidation stage");
    const addresses = shuffle(await this.client.getAllMarginfiAccountAddresses());
    debug("Found %s accounts", addresses.length);

    for (let i = 0; i < addresses.length; i++) {
      const liquidatedAccount = await this.processAccount(addresses[i]);

      debug("Account %s liquidated: %s", addresses[i], liquidatedAccount);

      if (liquidatedAccount) {
        debug("Account liquidated, stopping to rebalance");
        break;
      }
    }
  }

  private async processAccount(account: PublicKey): Promise<boolean> {
    const client = this.client;
    const group = this.group;
    const liquidatorAccount = this.account;

    if (account.equals(liquidatorAccount.publicKey)) {
      return false;
    }

    const debug = getDebugLogger(`process-account:${account.toBase58()}`);

    debug("Processing account %s", account);
    const marginfiAccount = await MarginfiAccount.fetch(account, client);
    if (marginfiAccount.canBeLiquidated()) {
      const { assets, liabilities } = marginfiAccount.getHealthComponents(MarginRequirementType.Maint);

      const maxLiabilityPaydown = liabilities.minus(assets);
      debug("Account can be liquidated, max liability paydown: %d", maxLiabilityPaydown);
    } else {
      debug("Account cannot be liquidated");
      return false;
    }

    if (!marginfiAccount.canBeLiquidated()) {
      debug("Account is healthy");
      return false;
    }

    captureMessage(`Liquidating account ${account.toBase58()}`);

    const { assets, liabilities } = marginfiAccount.getHealthComponents(MarginRequirementType.Maint);

    const maxLiabilityPaydownUsdValueMaint = liabilities.minus(assets);

    let maxLiabilityPaydownUsdValue = new BigNumber(0);
    let bestLiabAccountIndex = 0;

    // Find the biggest liability account that can be covered by liquidator
    // within the liquidators liquidation capacity
    for (let i = 0; i < marginfiAccount.activeBalances.length; i++) {
      const balance = marginfiAccount.activeBalances[i];
      const bank = group.getBankByPk(balance.bankPk)!;
      const maxLiabCoverage = liquidatorAccount.getMaxBorrowForBank(bank);
      const liquidatorLiabPayoffCapacityUsd = bank.getUsdValue(maxLiabCoverage, PriceBias.None, undefined, false);
      debug("Max borrow for bank: %d ($%d)", maxLiabCoverage, liquidatorLiabPayoffCapacityUsd);
      const { liabilities: liquidateeLiabUsdValue } = balance.getUsdValue(bank, MarginRequirementType.Equity);

      debug("Balance: liab: $%d, max coverage: %d", liquidateeLiabUsdValue, liquidatorLiabPayoffCapacityUsd);

      const liabUsdValue = BigNumber.min(liquidateeLiabUsdValue, liquidatorLiabPayoffCapacityUsd);

      if (liabUsdValue.gt(maxLiabilityPaydownUsdValue)) {
        maxLiabilityPaydownUsdValue = liabUsdValue;
        bestLiabAccountIndex = i;
      }
    }

    maxLiabilityPaydownUsdValue = BigNumber.min(maxLiabilityPaydownUsdValue, maxLiabilityPaydownUsdValueMaint);

    debug(
      "Max liability paydown USD value: %d, mint: %s",
      maxLiabilityPaydownUsdValue,
      group.getBankByPk(marginfiAccount.activeBalances[bestLiabAccountIndex].bankPk)!.mint
    );

    if (maxLiabilityPaydownUsdValue.lt(DUST_THRESHOLD_UI)) {
      debug("No liability to liquidate");
      return false;
    }

    let maxCollateralUsd = new BigNumber(0);
    let bestCollateralIndex = 0;

    // Find the biggest collateral account
    for (let i = 0; i < marginfiAccount.activeBalances.length; i++) {
      const balance = marginfiAccount.activeBalances[i];
      const bank = group.getBankByPk(balance.bankPk)!;

      const { assets: collateralUsdValue } = balance.getUsdValue(bank, MarginRequirementType.Equity);
      if (collateralUsdValue.gt(maxCollateralUsd)) {
        maxCollateralUsd = collateralUsdValue;
        bestCollateralIndex = i;
      }
    }

    debug(
      "Max collateral USD value: %d, mint: %s",
      maxCollateralUsd,
      group.getBankByPk(marginfiAccount.activeBalances[bestCollateralIndex].bankPk)!.mint
    );

    // This conversion is ignoring the liquidator discount, but the amounts still in legal bounds, as the liability paydown
    // is discounted meaning, the liquidation won't fail because of a too big paydown.
    const collateralToLiquidateUsdValue = BigNumber.min(maxCollateralUsd, maxLiabilityPaydownUsdValue).times(0.75);

    debug("Collateral to liquidate USD value: %d", collateralToLiquidateUsdValue);

    const collateralBankPk = marginfiAccount.activeBalances[bestCollateralIndex].bankPk;
    const collateralBank = group.getBankByPk(collateralBankPk)!;
    const collateralQuantity = collateralBank.getQuantityFromUsdValue(collateralToLiquidateUsdValue, PriceBias.None);

    const liabBankPk = marginfiAccount.activeBalances[bestLiabAccountIndex].bankPk;
    const liabBank = group.getBankByPk(liabBankPk)!;

    debug("Liquidating %d %s for %s", collateralQuantity, collateralBank.label, liabBank.label);
    const sig = await liquidatorAccount.lendingAccountLiquidate(
      marginfiAccount,
      collateralBank,
      collateralQuantity,
      liabBank
    );
    debug("Liquidation tx: %s", sig);

    return true;
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
