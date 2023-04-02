import { SystemProgram, Keypair, PublicKey, Transaction, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { MarginfiAccount, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

// ================================
// START: SUPERSTAKE INSTRUCTIONS
// ================================

const makeSwapIx = async ({
  connection,
  marginfiAccount,
  amount,
  inputTokenAddress,
  outputTokenAddress,
  inputTokenMintDecimals,
  slippageBps,
  tokenMap,
  routeMap,
  api,
}) => {

  const { data: routes } = await api.v4QuoteGet({
    amount: Math.round(amount * Math.pow(10,inputTokenMintDecimals-1)), // @todo confirm this is correct
    inputMint: inputTokenAddress.toBase58(),
    outputMint: outputTokenAddress.toBase58(),
    slippage: slippageBps / 10000,
  });  

  if (!routes || routes.length === 0) {
    throw new Error("No routes found for the given input and output tokens.");
  }

  const route = routes[0];

  const inputTokenInfo = tokenMap.get(inputTokenAddress.toBase58());
  const outputTokenInfo = tokenMap.get(outputTokenAddress.toBase58());
  if (!inputTokenInfo || !outputTokenInfo) {
    throw new Error("Input or output token not found in token map.");
  }

  const validOutputMints = routeMap.get(inputTokenAddress.toBase58()) || [];
  if (!validOutputMints.includes(outputTokenAddress.toBase58())) {
    throw new Error(
      "Output token is not a valid swap route for the given input token."
    );
  }

  const swapTransaction = await api.v4SwapPost({
    body: {
      route,
      userPublicKey: marginfiAccount.publicKey.toBase58(),
    },
  });

  const swapTransactionBuf = Buffer.from(swapTransaction.swapTransaction, 'base64');
  const tx = VersionedTransaction.deserialize(swapTransactionBuf);

  console.log(tx)

  const addressTableLookupsAccountKeys = tx.message.addressTableLookups.map((lookup) => lookup.accountKey);

  const lookupTableAccounts = await Promise.all(
    addressTableLookupsAccountKeys.map(
      async key => await connection.getAddressLookupTable(key).then((res) => res.value)
    )
  )

  const txMessageDecompiled = TransactionMessage.decompile(
    tx.message,
    {
      addressLookupTableAccounts: lookupTableAccounts,
    }
  );

  const instructions = txMessageDecompiled.instructions;

  return { instructions, lookupTableAccounts };
};

const makeSuperStakeIx = async ({
  connection,
  marginfiAccount,
  initialCollateralAmount,
  depositBank,
  borrowBank,
  maxLTV,
  slippageBpsSwapTolerance = 50,
  buffer = 0.9,
  tokenMap,
  routeMap,
  api,
}) => {

  const createLoop = async (
      initialLoopCollateralAmount
  ) => {

      const { instructions: depositIx } = await marginfiAccount.makeDepositIx(
        initialLoopCollateralAmount,
        depositBank.bank,
      );
      
      const { instructions: borrowIx } = await marginfiAccount.makeBorrowIx(
          initialLoopCollateralAmount * maxLTV * buffer,
          borrowBank.bank,
      );
      
      // // use jupiter api
      const { instructions: swapIx, lookupTableAccounts } = await makeSwapIx({
          connection,
          marginfiAccount,
          amount: initialLoopCollateralAmount * maxLTV * buffer,
          slippageBps: slippageBpsSwapTolerance,
          inputTokenAddress: borrowBank.tokenMint,
          outputTokenAddress: depositBank.tokenMint,
          inputTokenMintDecimals: borrowBank.bank.mintDecimals,
          tokenMap,
          routeMap,
          api,
      });

      // console.log({
      //   depositIx,
      //   borrowIx,
      //   swapIx,
      // });
  
      return {
          // instructions: [...depositIx, ...borrowIx, ...swapIx],
          instructions: swapIx,
          LSTSOLOutputAmount: initialLoopCollateralAmount * maxLTV * buffer * (1-slippageBpsSwapTolerance/10000),
          lookupTableAccounts,
      };
  }

  // loop 1
  const {
      instructions: LSTSOLloopInstructions1,
      LSTSOLOutputAmount: LSTSOLOutputAmount1,
      lookupTableAccounts: lookupTableAccounts1,
  } = await createLoop(initialCollateralAmount)
  
  // loop 2
  const {
      instructions: LSTSOLloopInstructions2,
      LSTSOLOutputAmount: LSTSOLOutputAmount2,
      lookupTableAccounts: lookupTableAccounts2,
  } = await createLoop(LSTSOLOutputAmount1)

  // loop 3
  const {
      instructions: LSTSOLloopInstructions3,
      LSTSOLOutputAmount: LSTSOLOutputAmount3,
      lookupTableAccounts: lookupTableAccounts3,
  } = await createLoop(LSTSOLOutputAmount2)

  // loop 4
  const {
      instructions: LSTSOLloopInstructions4,
      LSTSOLOutputAmount: LSTSOLOutputAmount4,
      lookupTableAccounts: lookupTableAccounts4,
  } = await createLoop(LSTSOLOutputAmount3)

  // final deposit
  const { instructions: finalDepositIx } = await marginfiAccount.makeDepositIx(
      LSTSOLOutputAmount4,
      depositBank.bank,
  );

  return {
      instructions: [
          ...LSTSOLloopInstructions1,
          ...LSTSOLloopInstructions2,
          ...LSTSOLloopInstructions3,
          ...LSTSOLloopInstructions4,
          ...finalDepositIx
      ],
      lookupTableAccounts: [
          ...lookupTableAccounts1,
          ...lookupTableAccounts2,
          ...lookupTableAccounts3,
          ...lookupTableAccounts4,
      ],
      // keys: []
  }
}

const makeWithdrawSuperStakeIx = async ({
  connection,
  marginfiAccount,
  initialWithdrawableAmount, // need to figure this out
  depositBank,
  borrowBank,
  maxLTV,
  slippageBpsSwapTolerance = 50,
  buffer = 0.9,
  tokenMap,
  routeMap,
  api,
}) => {

  const createLoop = async (LSTAvailableAmount) => {

      // use jupiter api
      const { instructions: swapIx } = await makeSwapIx({
        marginfiAccount,
        amount: LSTAvailableAmount,
        slippageBps: slippageBpsSwapTolerance,
        inputTokenAddress: depositBank.tokenMint,
        outputTokenAddress: borrowBank.tokenMint,
        inputTokenMintDecimals: depositBank.bank.mintDecimals,
        tokenMap,
        routeMap,
        api,
      });

      const { instructions: repayIx } = await marginfiAccount.makeRepayIx(
        LSTAvailableAmount * (1-slippageBpsSwapTolerance/10000),
        borrowBank,
      );

      const { instructions: withdrawIx } = await marginfiAccount.makeWithdrawIx(
          LSTAvailableAmount * (1-slippageBpsSwapTolerance/10000),
          depositBank,
      );
  
      return {
          instructions: [...swapIx, ...repayIx, ...withdrawIx],
          LSTSOLOutputAmount: LSTAvailableAmount * (1-slippageBpsSwapTolerance/10000),
      };
  }    

  // first withdraw
  const { 
    instructions: firstWithdrawIx,
    LSTSOLOutputAmount: LSTSOLOutputAmount0
  } = await marginfiAccount.makeWithdrawIx(
    initialWithdrawableAmount,
    depositBank
  );

  // reverse loop 1
  const {
      instructions: LSTSOLloopInstructions1,
      LSTSOLOutputAmount: LSTSOLOutputAmount1
  } = await createLoop(LSTSOLOutputAmount1)
  
  // reverse loop 2
  const {
      instructions: LSTSOLloopInstructions2,
      LSTSOLOutputAmount: LSTSOLOutputAmount2
  } = await createLoop(LSTSOLOutputAmount2)

  // reverse loop 3
  const {
      instructions: LSTSOLloopInstructions3,
      LSTSOLOutputAmount: LSTSOLOutputAmount3
  } = await createLoop(LSTSOLOutputAmount3)

  // reverse loop 4
  const {
      instructions: LSTSOLloopInstructions4,
      LSTSOLOutputAmount: LSTSOLOutputAmount4
  } = await createLoop(LSTSOLOutputAmount4)

  return {
      instructions: [
          ...firstWithdrawIx,
          ...LSTSOLloopInstructions1,
          ...LSTSOLloopInstructions2,
          ...LSTSOLloopInstructions3,
          ...LSTSOLloopInstructions4,
      ],
      keys: []
  }
}

// ================================
// END: SUPERSTAKE INSTRUCTIONS
// ================================

// ================================
// START: SUPERSTAKE HELPERS
// ================================

const superStake = async (
    mfiClient: MarginfiClient,
    marginfiAccount: MarginfiAccount,
    connection: Connection,
    wallet: Wallet,
    superStakeOrWithdrawAmount: number,
    depositBank: ExtendedBankInfo,
    borrowBank: ExtendedBankInfo,
    reloadBanks: () => void,
    tokenMap,
    routeMap,
    api
) => {

  const superStakeIxs = await makeSuperStakeIx({
    connection,
    marginfiAccount,
    initialCollateralAmount: superStakeOrWithdrawAmount,
    depositBank,
    borrowBank,
    maxLTV: depositBank.bank.config.assetWeightInit / borrowBank.bank.config.liabilityWeightInit,
    slippageBpsSwapTolerance: 50,
    buffer: 0.9,
    tokenMap,
    routeMap,
    api,
  })
  // console.log("   ✅ - Constructed superstake instructions");

  // const messageV0 = new TransactionMessage({
  //   payerKey: wallet.publicKey,
  //   recentBlockhash: (await connection.getRecentBlockhash()).blockhash,
  //   instructions: superStakeIxs.instructions,
  // }).compileToV0Message(superStakeIxs.lookupTableAccounts);
  // console.log("   ✅ - Compiled Transaction Message");

  // const tx = new VersionedTransaction(messageV0);
  // console.log(tx)
  // console.log("   ✅ - Created transaction");

  // const payer = Keypair.generate();

  // console.log(
  //   tx.message.staticAccountKeys.map((account) => account.toBase58())
  // )
  // console.log(
  //   superStakeIxs.lookupTableAccounts.map((account) => account.key.toBase58())
  // )
  // const minRent = 0;

  // const instructions = [
  //   SystemProgram.transfer({
  //     fromPubkey: payer.publicKey,
  //     toPubkey: payer.publicKey,
  //     lamports: minRent,
  //   }),
  // ];  
  // const instructions = superStakeIxs.instructions.slice(0,10);
  // console.log(instructions[0])

  // const messageV0 = new TransactionMessage({
  //   payerKey: payer.publicKey,
  //   recentBlockhash: (await connection.getRecentBlockhash()).blockhash,
  //   instructions,
  // }).compileToV0Message();
  // const tx = new VersionedTransaction(messageV0);
  // tx.sign([payer]);
  // console.log(tx);
  // const keypair = Keypair.generate();

  // tx.sign([keypair]);
  // console.log(tx)
  // console.log(keypair)
  // console.log(wallet);

  // wallet.signTransaction(tx);

  // tx.sign([wallet]);
  // console.log(tx)
  // console.log("   ✅ - Signed transaction");


  // const txid = await wallet.sendTransaction(tx, connection, {
  //   skipPreflight: true,
  // });
  // console.log("   ✅ - Sent transaction");
  // console.log(txid)
  
  return;

  await reloadBanks()
}

const withdrawSuperstake = async (
    mfiClient: MarginfiClient,
    marginfiAccount: MarginfiAccount,
    connection: Connection,
    wallet: Wallet,
    superStakeOrWithdrawAmount: number,
    depositBank: ExtendedBankInfo,
    borrowBank: ExtendedBankInfo,
    reloadBanks: () => void,
    tokenMap,
    routeMap,
    api
) => {

  const withdrawSuperStakeIxs = await makeWithdrawSuperStakeIx({
    connection,
    marginfiAccount,
    initialWithdrawableAmount: superStakeOrWithdrawAmount,
    depositBank,
    borrowBank,
    maxLTV: depositBank.bank.config.assetWeightInit / borrowBank.bank.config.liabilityWeightInit, // @todo DOUBLE CHECK
    slippageBpsSwapTolerance: 50,
    buffer: 0.9,
    tokenMap,
    routeMap,
    api,  
  })

  const tx = new Transaction().add(...withdrawSuperStakeIxs.instructions);
  const sig = await mfiClient.processTransaction(tx)
  await reloadBanks()
}

export {
    superStake,
    withdrawSuperstake
}
