import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import {
  Environment,
  getConfig,
  loadKeypair,
  MarginfiClient,
  MarginfiGroup,
  nativeToUi,
  NodeWallet,
  sleep,
  uiToNative,
  USDC_DECIMALS,
} from "@mrgnlabs/marginfi-client-v2";
import { PriceBias } from "@mrgnlabs/marginfi-client-v2/src/bank";
import JSBI from "jsbi";
import { Jupiter } from "@jup-ag/core";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
import MarginfiAccount, { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2/src/account";

const DUST_THRESHOLD = new BigNumber(10).pow(USDC_DECIMALS - 2);

const LIQUIDATOR_PK = new PublicKey(process.env.LIQUIDATOR_PK!);
const connection = new Connection(process.env.RPC_ENDPOINT!, "confirmed");
const wallet = new NodeWallet(loadKeypair(process.env.KEYPAIR_PATH ?? "~/.config/solana/id.json"));

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const SLEEP_INTERVAL = Number.parseInt(process.env.SLEEP_INTERVAL ?? "5000");

async function mainLoop(
  group: MarginfiGroup,
  liquidatorAccount: MarginfiAccount,
  client: MarginfiClient,
  jupiter: Jupiter
) {
  try {
    await swapNonUsdcInTokenAccounts(liquidatorAccount, group, jupiter);
    while (true) {
      console.log("Started main loop iteration");
      if (await needsToBeRebalanced(liquidatorAccount, group)) {
        await rebalancingStage(liquidatorAccount, group, jupiter);
        continue;
      }

      await liquidationStage(liquidatorAccount, group, client);
    }
  } catch (e) {
    console.error(e);
    await sleep(SLEEP_INTERVAL);
    await mainLoop(group, liquidatorAccount, client, jupiter);
  }
}

async function liquidationStage(liquidatorAccount: MarginfiAccount, group: MarginfiGroup, client: MarginfiClient) {
  console.log("Started liquidation stage");
  const addresses = await client.getAllMarginfiAccountAddresses();
  console.log("Found %s accounts", addresses.length);

  for (let i = 0; i < addresses.length; i++) {
    const liquidatedAccount = await processAccount(group, client, liquidatorAccount, addresses[i]);

    await sleep(SLEEP_INTERVAL);

    if (liquidatedAccount) {
      break;
    }
  }
}

async function needsToBeRebalanced(liquidatorAccount: MarginfiAccount, group: MarginfiGroup): Promise<boolean> {
  console.log("Checking if liquidator needs to be rebalanced");
  await group.reload();
  await liquidatorAccount.reload();

  const lendingAccountToRebalance = liquidatorAccount.lendingAccount
    .map((lendingAccount) => {
      const bank = group.getBankByPk(lendingAccount.bankPk)!;
      const { assets, liabilities } = lendingAccount.getQuantity(bank);

      return { bank, assets, liabilities };
    })
    .filter(({ bank, assets, liabilities }) => {
      return (assets.gt(DUST_THRESHOLD) && !bank.mint.equals(USDC_MINT)) || liabilities.gt(DUST_THRESHOLD);
    });

  const lendingAccountToRebalanceExists = lendingAccountToRebalance.length > 0;
  console.log("Liquidator account needs to be rebalanced: %s", lendingAccountToRebalanceExists ? "true" : "false");

  if (lendingAccountToRebalanceExists) {
    console.log("Lending accounts to rebalance:");
    lendingAccountToRebalance.forEach(({ bank, assets, liabilities }) => {
      console.log(`Bank: ${bank.label}, Assets: ${assets}, Liabilities: ${liabilities}`);
    });
  }

  return lendingAccountToRebalanceExists;
}

async function processAccount(
  group: MarginfiGroup,
  client: MarginfiClient,
  liquidatorAccount: MarginfiAccount,
  marginfiAccountAddress: PublicKey
): Promise<boolean> {
  console.log("Processing account %s", marginfiAccountAddress);
  const marginfiAccount = await MarginfiAccount.fetch(marginfiAccountAddress, client);
  if (marginfiAccount.canBeLiquidated()) {
    const { assets, liabilities } = marginfiAccount.getHealthComponents(MarginRequirementType.Maint);

    const maxLiabilityPaydown = liabilities.minus(assets);
    console.log("Account can be liquidated, max liability paydown: %d", maxLiabilityPaydown);
  } else {
    console.log("Account cannot be liquidated");
    return false;
  }

  if (!marginfiAccount.canBeLiquidated()) {
    console.log("Account is healthy");
    return false;
  }

  let maxLiabilityPaydownUsdValue = new BigNumber(0);
  let bestLiabAccountIndex = 0;

  // Find the biggest liability account that can be covered by liquidator
  // within the liquidators liquidation capacity
  for (let i = 0; i < marginfiAccount.lendingAccount.length; i++) {
    const balance = marginfiAccount.lendingAccount[i];
    const bank = group.getBankByPk(balance.bankPk)!;
    const maxLiabCoverage = liquidatorAccount.getMaxBorrowForBank(bank);
    const liquidatorLiabPayoffCapacityUsd = bank.getUsdValue(maxLiabCoverage, PriceBias.None, undefined, false);
    console.log("Max borrow for bank: %d ($%d)", maxLiabCoverage, liquidatorLiabPayoffCapacityUsd);
    const { liabilities: liquidateeLiabUsdValue } = balance.getUsdValue(bank, MarginRequirementType.Equity);

    console.log("Balance: liab: $%d, max coverage: %d", liquidateeLiabUsdValue, liquidatorLiabPayoffCapacityUsd);

    const liabUsdValue = BigNumber.min(liquidateeLiabUsdValue, liquidatorLiabPayoffCapacityUsd);

    if (liabUsdValue.gt(maxLiabilityPaydownUsdValue)) {
      maxLiabilityPaydownUsdValue = liabUsdValue;
      bestLiabAccountIndex = i;
    }
  }

  console.log(
    "Max liability paydown USD value: %d, mint: %s",
    maxLiabilityPaydownUsdValue,
    group.getBankByPk(marginfiAccount.lendingAccount[bestLiabAccountIndex].bankPk)!.mint
  );

  let maxCollateralUsd = new BigNumber(0);
  let bestCollateralIndex = 0;

  // Find the biggest collateral account
  for (let i = 0; i < marginfiAccount.lendingAccount.length; i++) {
    const balance = marginfiAccount.lendingAccount[i];
    const bank = group.getBankByPk(balance.bankPk)!;

    const { assets: collateralUsdValue } = balance.getUsdValue(bank, MarginRequirementType.Equity);
    if (collateralUsdValue.gt(maxCollateralUsd)) {
      maxCollateralUsd = collateralUsdValue;
      bestCollateralIndex = i;
    }
  }

  console.log(
    "Max collateral USD value: %d, mint: %s",
    maxCollateralUsd,
    group.getBankByPk(marginfiAccount.lendingAccount[bestCollateralIndex].bankPk)!.mint
  );

  // This conversion is ignoring the liquidator discount, but the amounts still in legal bounds, as the liability paydown
  // is discounted meaning, the liquidation won't fail because of a too big paydown.
  const collateralToLiquidateUsdValue = BigNumber.min(maxCollateralUsd, maxLiabilityPaydownUsdValue);

  console.log("Collateral to liquidate USD value: %d", collateralToLiquidateUsdValue);

  const collateralBankPk = marginfiAccount.lendingAccount[bestCollateralIndex].bankPk;
  const collateralBank = group.getBankByPk(collateralBankPk)!;
  const collateralQuantity = collateralBank.getQuantityFromUsdValue(collateralToLiquidateUsdValue, PriceBias.None);

  const liabBankPk = marginfiAccount.lendingAccount[bestLiabAccountIndex].bankPk;
  const liabBank = group.getBankByPk(liabBankPk)!;

  console.log("Liquidating %d %s for %s", collateralQuantity, collateralBank.label, liabBank.label);
  const sig = await liquidatorAccount.lendingAccountLiquidate(
    marginfiAccount,
    collateralBank,
    collateralQuantity,
    liabBank
  );
  console.log("Liquidation tx: %s", sig);

  return true;
}

async function rebalancingStage(mfiAccount: MarginfiAccount, group: MarginfiGroup, jupiter: Jupiter) {
  console.log("Starting rebalancing stage");
  await sellNonUsdcDeposits(mfiAccount, group, jupiter);
  await repayAllDebt(mfiAccount, group, jupiter);
  await depositRemainingUsdc(mfiAccount, group);
}

/**
 * 1. step of the account re-balancing

 * Withdraw all non-usdc deposits from account and sell them to usdc.
 * This step will only withdraw up until the free collateral threshold, if some collateral is tied up the bot will deposit
 * in a later stage the borrowed liabilities and usdc to untie the remaining collateral.
 */
async function sellNonUsdcDeposits(mfiAccount: MarginfiAccount, group: MarginfiGroup, jupiter: Jupiter) {
  console.log("Starting non-usdc deposit sell step (1/3)");
  let balancesWithNonUsdcDeposits = mfiAccount.lendingAccount
    .map((balance) => {
      let bank = group.getBankByPk(balance.bankPk)!;
      let { assets } = balance.getQuantity(bank);

      return { assets, bank };
    })
    .filter(({ assets, bank }) => !bank.mint.equals(USDC_MINT) && assets.gt(DUST_THRESHOLD));

  for (let { bank } of balancesWithNonUsdcDeposits) {
    let maxWithdrawAmount = mfiAccount.getMaxWithdrawForBank(bank);

    if (maxWithdrawAmount.eq(0)) {
      console.log("No untied %s to withdraw", bank.label);
      continue;
    }

    console.log("Withdrawing %d %s", maxWithdrawAmount, bank.label);
    let withdrawSig = await mfiAccount.withdraw(maxWithdrawAmount, bank);

    console.log("Withdraw tx: %s", withdrawSig);

    await mfiAccount.reload();

    console.log("Swapping %s to USDC", bank.mint);

    const tokenAccountAta = await associatedAddress({
      mint: bank.mint,
      owner: wallet.publicKey,
    });
    const balance = (await connection.getTokenAccountBalance(tokenAccountAta)).value.amount;

    const routes = await jupiter.computeRoutes({
      inputMint: bank.mint,
      outputMint: USDC_MINT,
      amount: JSBI.BigInt(balance),
      slippageBps: 10,
    });

    const bestRoute = routes.routesInfos[0];

    const trade = await jupiter.exchange({ routeInfo: bestRoute });
    const res = await trade.execute();
    // @ts-ignore
    if (res.error) {
      // @ts-ignore
      throw new Error(res.error);
    }
    console.log("Tx signature: %s", res);
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
async function repayAllDebt(mfiAccount: MarginfiAccount, group: MarginfiGroup, jupiter: Jupiter) {
  console.log("Starting debt repayment step (2/3)");
  const balancesWithNonUsdcLiabilities = mfiAccount.lendingAccount
    .map((balance) => {
      let bank = group.getBankByPk(balance.bankPk)!;
      let { liabilities } = balance.getQuantity(bank);

      return { liabilities, bank };
    })
    .filter(({ liabilities, bank }) => liabilities.gt(DUST_THRESHOLD) && !bank.mint.equals(USDC_MINT));

  let usdcAta = await associatedAddress({
    mint: USDC_MINT,
    owner: wallet.publicKey,
  });

  for (let { liabilities, bank } of balancesWithNonUsdcLiabilities) {
    console.log("Repaying %d %s", nativeToUi(liabilities, bank.mintDecimals), bank.label);
    let availableUsdcInTokenAccount = new BigNumber((await connection.getTokenAccountBalance(usdcAta)).value.uiAmount!);

    await group.reload();
    const usdcBank = group.getBankByMint(USDC_MINT)!;
    await usdcBank.reloadPriceData(connection);
    const availableUsdcLiquidity = mfiAccount.getMaxBorrowForBank(usdcBank);

    await bank.reloadPriceData(connection);
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
      console.log("Withdrawing %d USDC", usdcToWithdraw);
      const withdrawSig = await mfiAccount.withdraw(usdcToWithdraw, usdcBank);
      console.log("Withdraw tx: %s", withdrawSig);
      await mfiAccount.reload();
    }

    availableUsdcInTokenAccount = new BigNumber((await connection.getTokenAccountBalance(usdcAta)).value.uiAmount!);

    usdcBuyingPower = BigNumber.min(availableUsdcInTokenAccount, liabUsdcValue);

    const usdcAmount = uiToNative(usdcBuyingPower, USDC_DECIMALS);
    console.log("Swapping %d USDC to %s", usdcBuyingPower, bank.label);
    const routes = await jupiter.computeRoutes({
      inputMint: USDC_MINT,
      outputMint: bank.mint,
      amount: JSBI.BigInt(usdcAmount),
      slippageBps: 10,
    });

    const bestRoute = routes.routesInfos[0];
    const trade = await jupiter.exchange({
      routeInfo: bestRoute,
      wrapUnwrapSOL: false,
    });

    const res = await trade.execute();
    // @ts-ignore
    if (res.error) {
      // @ts-ignore
      throw new Error(res.error);
    }
    console.log("Tx signature: %s", res);

    const liabTokenAccountAta = await associatedAddress({
      mint: bank.mint,
      owner: wallet.publicKey,
    });
    const liabBalance = new BigNumber((await connection.getTokenAccountBalance(liabTokenAccountAta)).value.uiAmount!);
    const depositSig = await mfiAccount.deposit(liabBalance, bank);
    console.log("Deposit tx: %s", depositSig);
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
async function depositRemainingUsdc(mfiAccount: MarginfiAccount, group: MarginfiGroup) {
  console.log("Starting remaining usdc deposit step (3/3)");
  const usdcAta = await associatedAddress({
    mint: USDC_MINT,
    owner: wallet.publicKey,
  });

  const usdcBalance = new BigNumber((await connection.getTokenAccountBalance(usdcAta)).value.uiAmount!);

  const usdcBank = group.getBankByMint(USDC_MINT)!;
  const depositTx = await mfiAccount.deposit(usdcBalance, usdcBank);
  console.log("Deposit tx: %s", depositTx);
}

async function getTokenAccountBalance(tokenAccount: PublicKey) {
  try {
    return new BigNumber((await connection.getTokenAccountBalance(tokenAccount)).value.uiAmount!);
  } catch (e) {
    return new BigNumber(0);
  }
}

async function swapNonUsdcInTokenAccounts(mfiAccount: MarginfiAccount, group: MarginfiGroup, jupiter: Jupiter) {
  console.log("Swapping any remaining non-usdc to usdc");
  const banks = group.banks.values();
  for (let bankInterEntry = banks.next(); !bankInterEntry.done; bankInterEntry = banks.next()) {
    const bank = bankInterEntry.value;
    if (bank.mint.equals(USDC_MINT)) {
      continue;
    }

    const tokenAccountAta = await associatedAddress({
      mint: bank.mint,
      owner: wallet.publicKey,
    });

    console.log("Checking %s", tokenAccountAta);

    //@ts-ignore
    const amount = await getTokenAccountBalance(tokenAccountAta);

    if (amount.eq(0)) {
      continue;
    }

    console.log("Swapping %d %s to USDC", amount, bank.label);

    const routes = await jupiter.computeRoutes({
      inputMint: bank.mint,
      outputMint: USDC_MINT,
      amount: JSBI.BigInt(uiToNative(amount, bank.mintDecimals)),
      slippageBps: 10,
    });

    const bestRoute = routes.routesInfos[0];
    const trade = await jupiter.exchange({ routeInfo: bestRoute });
    const tradeSig = await trade.execute();
    console.log("Tx signature: %s", tradeSig);
  }

  const usdcAta = await associatedAddress({
    mint: USDC_MINT,
    owner: wallet.publicKey,
  });
  const usdcBalance = await connection.getTokenAccountBalance(usdcAta);

  if (usdcBalance.value.uiAmount === 0) {
    console.log("No USDC to deposit");
    return;
  }

  console.log("Depositing %d USDC", usdcBalance.value.uiAmount);

  const tx = await mfiAccount.deposit(usdcBalance.value.uiAmount!, group.getBankByMint(USDC_MINT)!);

  console.log("Deposit tx: %s", tx);
}

async function main() {
  console.log("Starting liquidator");
  const config = getConfig((process.env.MRGN_ENV as Environment) ?? "alpha");
  const client = await MarginfiClient.fetch(config, wallet, connection);
  const group = await MarginfiGroup.fetch(config, client.program);
  const liquidatorAccount = await MarginfiAccount.fetch(LIQUIDATOR_PK, client);
  const jupiter = await Jupiter.load({
    connection,
    cluster: "mainnet-beta",
    user: wallet.payer,
  });

  console.log("Liquidator account: %s", liquidatorAccount.publicKey.toBase58());
  console.log("Program id: %s", client.program.programId);
  console.log("Group: %s", group.publicKey);

  await mainLoop(group, liquidatorAccount, client, jupiter);
}

main().catch((e) => console.log(e));
