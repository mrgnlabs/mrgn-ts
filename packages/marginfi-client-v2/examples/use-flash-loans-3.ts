import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { getMarginfiClient } from "./utils";
import { QuoteGetRequest, createJupiterApiClient } from "@jup-ag/api";
import { LUT_PROGRAM_AUTHORITY_INDEX, nativeToUi, uiToNative } from "@mrgnlabs/mrgn-common";
import { computeMaxLeverage } from "../src";

async function main() {
  const client = await getMarginfiClient({ readonly: true });
  console.log("signer:", client.wallet.publicKey.toBase58());
  const jupiterQuoteApi = createJupiterApiClient();

  const marginfiAccounts = await client.getMarginfiAccountsForAuthority();
  if (marginfiAccounts.length === 0) throw Error("No marginfi account found");

  const marginfiAccount = marginfiAccounts[0];

  // Inputs

  const depositToken = "LST"
  const borrowToken = "SOL"
  const targetLeverage = 2.06;
  const principalAmountUi = 2.22;
  const maxSlippage = 0.01;

  const depositBank = client.getBankByTokenSymbol(depositToken);
  if (!depositBank) throw Error(`${depositToken} bank not found`);
  const borrowBank = client.getBankByTokenSymbol(borrowToken);
  if (!borrowBank) throw Error(`${borrowToken} bank not found`);

  const { maxLeverage, ltv } = computeMaxLeverage(
    depositBank,
    borrowBank,
  );

  // Constraints

  console.log("maxLeverage:", maxLeverage);
  console.log("ltv:", ltv);

  // Action

  const principalBufferAmountUi = principalAmountUi * targetLeverage * maxSlippage;
  const adjustedPrincipalAmountUi = principalAmountUi - principalBufferAmountUi;
  console.log("principalBufferAmountUi:", principalBufferAmountUi);
  console.log("adjustedPrincipalAmountUi:", adjustedPrincipalAmountUi);

  const { borrowAmount, depositAmount } = marginfiAccount.computeLoopingParams(
    adjustedPrincipalAmountUi,
    targetLeverage,
    depositBank.address,
    borrowBank.address,
  );

  const borrowAmountNative = uiToNative(borrowAmount, borrowBank.mintDecimals).toNumber();

  console.log("targetLeverage:", targetLeverage);
  console.log("borrowAmount:", borrowAmount.toNumber());
  console.log("depositAmount:", depositAmount.toNumber());

  const quoteParams = {
    amount: borrowAmountNative,
    inputMint: borrowBank.mint.toBase58(),
    outputMint: depositBank.mint.toBase58(),
    slippageBps: Math.floor(maxSlippage * 10000),
    swapMode: "ExactIn",
    maxAccounts: 40,
  } as QuoteGetRequest;
  const swapQuote = await jupiterQuoteApi.quoteGet(quoteParams);

  const minSwapAmountOutUi = nativeToUi(swapQuote.otherAmountThreshold, depositBank.mintDecimals);
  console.log("minSwapAmountOutUi:", minSwapAmountOutUi);
  console.log("priceImpact:", swapQuote.priceImpactPct);

  const {
    swapInstruction,
    addressLookupTableAddresses,
  } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: swapQuote,
      userPublicKey: marginfiAccount.authority.toBase58(),
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
    },
  });

  const swapIx = deserializeInstruction(swapInstruction);

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(
    ...(await getAdressLookupTableAccounts(client.provider.connection, addressLookupTableAddresses))
  );

  const actualDepositAmountUi = minSwapAmountOutUi + principalAmountUi;

  // const { marginfiAccount: simMfiAccount } = await marginfiAccount.simulateLoop(
  //   actualDepositAmountUi,
  //   borrowAmount,
  //   depositBank.address,
  //   borrowBank.address,
  //   [swapIx],
  //   swapLUTs,
  // );

  // console.log("pre:", marginfiAccount.describe());
  // console.log("sim:", simMfiAccount.describe());

  const sig = await marginfiAccount.loop(
    actualDepositAmountUi,
    borrowAmount,
    depositBank.address,
    borrowBank.address,
    [swapIx],
    swapLUTs,
  );

  console.log("sig:", sig);
}

main().catch((e) => console.log(e));

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const deserializeInstruction = (instruction: any) => {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((key: any) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
};

const getAdressLookupTableAccounts = async (
  connection: Connection,
  keys: string[]
): Promise<AddressLookupTableAccount[]> => {
  const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
    keys.map((key) => new PublicKey(key))
  );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, new Array<AddressLookupTableAccount>());
};
