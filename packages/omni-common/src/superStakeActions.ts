import { PublicKey, VersionedTransaction, TransactionMessage, Connection } from "@solana/web3.js";
import { ExtendedBankInfo, MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { Marinade, MarinadeConfig } from "@marinade.finance/marinade-ts-sdk";
import { uiToNative, nativeToUi } from "@mrgnlabs/mrgn-common";
import { JupiterParams } from "./types";

// ================================
// START: SUPERSTAKE INSTRUCTIONS
// ================================

interface SwapParams {
  walletAddress: PublicKey;
  connection: Connection;
  amount: number;
  inputTokenMintDecimals: number;
}

const makeMarinadeDepositSwapIx = async ({ walletAddress, connection, amount, inputTokenMintDecimals }: SwapParams) => {
  const config = new MarinadeConfig({
    connection: connection,
    publicKey: walletAddress,
  });

  const marinade = new Marinade(config);
  const tx = await marinade.deposit(uiToNative(amount, inputTokenMintDecimals));

  const ix = tx.transaction.instructions;

  return {
    instructions: ix,
  };
};

interface JupiterSwapParams {
  marginfiAccount: MarginfiAccount;
  amount: number;
  inputBankInfo: ExtendedBankInfo;
  outputBankInfo: ExtendedBankInfo;
  buffer?: number;
  jupiter: JupiterParams;
}

const makeJupiterSwapIx = async ({
  marginfiAccount,
  amount,
  inputBankInfo,
  outputBankInfo,
  buffer,
  jupiter,
}: JupiterSwapParams) => {
  const { data: routes } = await jupiter.api.v4QuoteGet({
    amount: uiToNative(amount, inputBankInfo.bank.mintDecimals).toString(),
    inputMint: inputBankInfo.bank.mint.toBase58(),
    outputMint: outputBankInfo.bank.mint.toBase58(),
    slippageBps: Math.round((1 - (buffer || 1)) * 10000),
  });

  if (!routes || routes.length === 0) {
    throw new Error("No routes found for the given input and output tokens.");
  }

  const route = routes[0];

  const inputTokenInfo = jupiter.tokenMap.get(inputBankInfo.bank.mint.toBase58());
  const outputTokenInfo = jupiter.tokenMap.get(outputBankInfo.bank.mint.toBase58());
  if (!inputTokenInfo || !outputTokenInfo) {
    throw new Error("Input or output token not found in token map.");
  }

  const validOutputMints = jupiter.routeMap.get(inputBankInfo.bank.mint.toBase58()) || [];
  if (!validOutputMints.includes(outputBankInfo.bank.mint.toBase58())) {
    throw new Error("Output token is not a valid swap route for the given input token.");
  }

  const swapTransaction = await jupiter.api.v4SwapPost({
    body: {
      // @ts-ignore
      route: route,
      userPublicKey: marginfiAccount.client.provider.wallet.publicKey.toBase58(),
    },
  });

  // @ts-ignore
  const swapTransactionBuf = Buffer.from(swapTransaction.swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(swapTransactionBuf);

  const addressTableLookupsAccountKeys = tx.message.addressTableLookups.map((lookup) => lookup.accountKey);

  const lookupTableAccounts = await Promise.all(
    addressTableLookupsAccountKeys.map(
      async (key) =>
        await marginfiAccount.client.provider.connection.getAddressLookupTable(key).then((res) => res.value)
    )
  );
  if (!(lookupTableAccounts.length > 0)) {
    throw new Error("No lookup table accounts found.");
  }

  const txMessageDecompiled = TransactionMessage.decompile(tx.message, {
    // @ts-ignore
    addressLookupTableAccounts: lookupTableAccounts,
  });
  const ix = txMessageDecompiled.instructions;

  // @note we're conservatively adding a buffer here, but this can be removed with some more work
  const SOLOutputAmount = amount * (inputBankInfo.tokenPrice / outputBankInfo.tokenPrice) * (buffer || 1);

  console.log({
    ix,
    programs: ix.map((i) => i.programId.toBase58()),
  });

  return {
    instructions: ix,
    SOLOutputAmount,
  };
};

interface SuperStakeParams {
  marginfiAccount: MarginfiAccount;
  initialCollateralAmount: number;
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  maxLTV: number;
  buffer?: number;
}

const makeSuperStakeIx = async ({
  marginfiAccount,
  initialCollateralAmount,
  depositBank,
  borrowBank,
  maxLTV,
  buffer = 0.99,
}: SuperStakeParams) => {
  const createLoop = async (initialLoopCollateralAmount: number) => {
    const { instructions: depositIx } = await marginfiAccount.makeDepositIx(
      initialLoopCollateralAmount,
      depositBank.bank
    );

    const calcSOLAmount =
      initialLoopCollateralAmount * maxLTV * (depositBank.tokenPrice / borrowBank.tokenPrice) * buffer;

    const { instructions: borrowIx } = await marginfiAccount.makeBorrowIx(
      calcSOLAmount, // @todo we should be able to just make this max borrow
      borrowBank.bank,
      { remainingAccountsBankOverride: [depositBank.bank, borrowBank.bank] }
    );

    const { instructions: swapIx } = await makeMarinadeDepositSwapIx({
      walletAddress: marginfiAccount.client.wallet.publicKey,
      connection: marginfiAccount.client.provider.connection,
      amount: calcSOLAmount,
      inputTokenMintDecimals: borrowBank.bank.mintDecimals,
    });

    return {
      instructions: [...depositIx, ...borrowIx, ...swapIx],
      // @todo we can do better at estimating how much output LSTSOL we're going to have here.
      // Right now we're calculating the expected fx based on the token price and using a 2% buffer.
      // Impact here is that if we calculate wrong (i.e. we expect more LSTSOL than we actually get),
      // then the transaction will fail so users should stay safe.
      LSTSOLOutputAmount: (calcSOLAmount / (depositBank.tokenPrice / borrowBank.tokenPrice)) * 0.98,
    };
  };

  // loop 1
  const { instructions: LSTSOLloopInstructions1, LSTSOLOutputAmount: LSTSOLOutputAmount1 } = await createLoop(
    initialCollateralAmount
  );

  // loop 2
  const { instructions: LSTSOLloopInstructions2, LSTSOLOutputAmount: LSTSOLOutputAmount2 } = await createLoop(
    LSTSOLOutputAmount1
  );

  // loop 3
  const { instructions: LSTSOLloopInstructions3, LSTSOLOutputAmount: LSTSOLOutputAmount3 } = await createLoop(
    LSTSOLOutputAmount2
  );

  // loop 4
  const { instructions: LSTSOLloopInstructions4, LSTSOLOutputAmount: LSTSOLOutputAmount4 } = await createLoop(
    LSTSOLOutputAmount3
  );

  // final deposit
  const { instructions: finalDepositIx } = await marginfiAccount.makeDepositIx(LSTSOLOutputAmount4, depositBank.bank);

  return {
    instructions: [
      ...LSTSOLloopInstructions1,
      ...LSTSOLloopInstructions2,
      ...LSTSOLloopInstructions3,
      ...LSTSOLloopInstructions4,
      ...finalDepositIx,
    ],
  };
};

interface WithdrawSuperStakeParams {
  marginfiAccount: MarginfiAccount;
  initialWithdrawableAmount: number;
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  maxLTV: number;
  buffer?: number;
  jupiter: JupiterParams;
}

const makeWithdrawSuperStakeIx = async ({
  marginfiAccount,
  initialWithdrawableAmount, // need to figure this out
  depositBank,
  borrowBank,
  buffer = 0.99,
  jupiter,
}: WithdrawSuperStakeParams) => {
  console.log("constructing instructions");

  // first withdraw
  const { instructions: withdrawIx } = await marginfiAccount.makeWithdrawIx(
    initialWithdrawableAmount,
    depositBank.bank
  );

  // swap withdrawn mSOL to SOL
  const { instructions: swapIx, SOLOutputAmount } = await makeJupiterSwapIx({
    marginfiAccount,
    amount: initialWithdrawableAmount,
    inputBankInfo: depositBank,
    outputBankInfo: borrowBank,
    buffer,
    jupiter,
  });

  // repay SOL
  const { instructions: repayIx } = await marginfiAccount.makeRepayIx(SOLOutputAmount, borrowBank.bank);

  return {
    instructions: [...withdrawIx, ...swapIx, ...repayIx],
  };
};

// ================================
// END: SUPERSTAKE INSTRUCTIONS
// ================================

// ================================
// START: SUPERSTAKE HELPERS
// ================================

const superStake = async (
  marginfiAccount: MarginfiAccount,
  superStakeOrWithdrawAmount: number,
  depositBank: ExtendedBankInfo,
  borrowBank: ExtendedBankInfo,
  reloadBanks: () => void
) => {
  const superStakeIxs = await makeSuperStakeIx({
    marginfiAccount,
    initialCollateralAmount: superStakeOrWithdrawAmount,
    depositBank,
    borrowBank,
    maxLTV:
      nativeToUi(depositBank.bank.config.assetWeightInit, 0) /
      nativeToUi(borrowBank.bank.config.liabilityWeightInit, 0),
    buffer: 0.99,
  });

  const lutAccount = await marginfiAccount.client.provider.connection
    .getAddressLookupTable(new PublicKey("B3We5gAbzUCWYvp85rGMyAhsDCV9wypk7dXG7FyETdQ3"))
    .then((res) => res.value);
  if (!lutAccount) {
    throw new Error("LUT account not found");
  }

  const messageV0 = new TransactionMessage({
    payerKey: marginfiAccount.client.wallet.publicKey,
    recentBlockhash: (await marginfiAccount.client.provider.connection.getRecentBlockhash()).blockhash,
    instructions: superStakeIxs.instructions,
  }).compileToV0Message([lutAccount]);
  const tx = new VersionedTransaction(messageV0);

  console.log("✅ -------- constructed final transaction -------- ✅");
  console.log(tx);

  const txid = await marginfiAccount.client.processTransaction(tx, [], { skipPreflight: true });
  console.log(txid);

  await reloadBanks();
};

const withdrawSuperstake = async (
  marginfiAccount: MarginfiAccount,
  superStakeOrWithdrawAmount: number,
  depositBank: ExtendedBankInfo,
  borrowBank: ExtendedBankInfo,
  reloadBanks: () => void,
  jupiter: JupiterParams
) => {
  const withdrawSuperStakeIxs = await makeWithdrawSuperStakeIx({
    marginfiAccount,
    initialWithdrawableAmount: superStakeOrWithdrawAmount,
    depositBank,
    borrowBank,
    maxLTV:
      nativeToUi(depositBank.bank.config.assetWeightInit, 0) /
      nativeToUi(borrowBank.bank.config.liabilityWeightInit, 0),
    buffer: 0.99,
    jupiter,
  });

  console.log({
    withdrawSuperStakeIxs,
  });

  const lutAccount = await marginfiAccount.client.provider.connection
    .getAddressLookupTable(new PublicKey("B3We5gAbzUCWYvp85rGMyAhsDCV9wypk7dXG7FyETdQ3"))
    .then((res) => res.value);
  if (!lutAccount) {
    throw new Error("LUT account not found");
  }

  const messageV0 = new TransactionMessage({
    payerKey: marginfiAccount.client.provider.wallet.publicKey,
    recentBlockhash: (await marginfiAccount.client.provider.connection.getRecentBlockhash()).blockhash,
    instructions: withdrawSuperStakeIxs.instructions,
  }).compileToV0Message([lutAccount]);

  console.log("tx created");

  const tx = new VersionedTransaction(messageV0);
  console.log("versioned tx created");

  const txid = await marginfiAccount.client.processTransaction(tx, [], { skipPreflight: true });
  console.log(txid);

  await reloadBanks();
};

export { superStake, withdrawSuperstake };
