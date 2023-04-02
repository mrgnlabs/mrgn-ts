import { SystemProgram, Keypair, PublicKey, Transaction, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { MarginfiAccount, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@mrgnlabs/mrgn-common/src/spl";

// ================================
// START: SUPERSTAKE INSTRUCTIONS
// ================================

const makeSwapIx = async ({
  wallet,
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

  console.log("   ✅ - running swap");  
  const config = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
  })
  console.log("   ✅ - got config");  

  const marinade = new Marinade(config)
  const marinadeState = await marinade.getMarinadeState();
  const program = await marinade.provideReferralOrMainProgram();
  console.log("   ✅ - got program");
  const instruction = program.liquidUnstakeInstruction({
    amount : amount * 1000000,
    accounts: {
      state: marinadeState.marinadeStateAddress,
      msolMint: marinadeState.mSolMintAddress,
      liqPoolMsolLeg: marinadeState.mSolLeg,
      liqPoolSolLegPda: await marinadeState.solLeg(),
      getMsolFrom: getAssociatedTokenAddressSync(
        marinadeState.mSolMintAddress,
        wallet.publicKey,
      ),
      getMsolFromAuthority: wallet.publicKey,
      transferSolTo: wallet.publicKey,
      treasuryMsolAccount: marinadeState.treasuryMsolAccount,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    }
  })
  console.log("   ✅ - constructed instruction");

  return {
    instructions: [instruction]
  }
};

const makeSuperStakeIx = async ({
  wallet,
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
      const { instructions: swapIx } = await makeSwapIx({
          wallet,
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
  
      return {
          instructions: [...depositIx, ...borrowIx, ...swapIx],
          LSTSOLOutputAmount: initialLoopCollateralAmount * maxLTV * buffer * (1-slippageBpsSwapTolerance/10000),
      };
  }

  // loop 1
  const {
      instructions: LSTSOLloopInstructions1,
      LSTSOLOutputAmount: LSTSOLOutputAmount1,
  } = await createLoop(initialCollateralAmount)
  
  // loop 2
  const {
      instructions: LSTSOLloopInstructions2,
      LSTSOLOutputAmount: LSTSOLOutputAmount2,
  } = await createLoop(LSTSOLOutputAmount1)

  // loop 3
  const {
      instructions: LSTSOLloopInstructions3,
      LSTSOLOutputAmount: LSTSOLOutputAmount3,
  } = await createLoop(LSTSOLOutputAmount2)

  // loop 4
  const {
      instructions: LSTSOLloopInstructions4,
      LSTSOLOutputAmount: LSTSOLOutputAmount4,
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
  }
}

const makeWithdrawSuperStakeIx = async ({
  wallet,
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
    wallet,
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

  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: (await connection.getRecentBlockhash()).blockhash,
    instructions: superStakeIxs.instructions,
  }).compileToV0Message();
  const tx = new VersionedTransaction(messageV0)
  wallet.signTransaction(tx);

  console.log(tx);
  
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
    wallet,
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

  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: (await connection.getRecentBlockhash()).blockhash,
    instructions: superStakeIxs.instructions,
  }).compileToV0Message();
  const tx = new VersionedTransaction(messageV0)
  wallet.signTransaction(tx);

  await reloadBanks()
}

export {
    superStake,
    withdrawSuperstake
}
