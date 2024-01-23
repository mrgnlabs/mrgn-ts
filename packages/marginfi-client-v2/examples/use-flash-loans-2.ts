import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {  getMarginfiClient } from "./utils";
import { createJupiterApiClient } from "@jup-ag/api";
import { nativeToUi } from "@mrgnlabs/mrgn-common";

async function main() {
  const client = await getMarginfiClient({ readonly: true });
  const jupiterQuoteApi = createJupiterApiClient();

  const marginfiAccounts = await client.getMarginfiAccountsForAuthority();
  if (marginfiAccounts.length === 0) throw Error("No marginfi account found");

  const marginfiAccount = marginfiAccounts[0];

  // Assumption: account has enough USDC to repay the whole USDT borrow, accounting for slippage

  const usdcBank = client.getBankByTokenSymbol("USDC");
  if (!usdcBank) throw Error("USDC bank not found");
  const usdtBank = client.getBankByTokenSymbol("USDT");
  if (!usdtBank) throw Error("USDT bank not found");

  const usdtBalance = marginfiAccount.getBalance(usdtBank.address);
  const usdtAmountToRepay = usdtBalance.computeQuantity(usdcBank).liabilities.integerValue();

  const quoteParams = {
    amount: usdtAmountToRepay.toNumber(),
    inputMint: usdcBank.mint.toBase58(),
    outputMint: usdtBank.mint.toBase58(),
    slippageBps: 100,
    swapMode: "ExactOut" as any,
    maxAccounts: 20,
  };
  const swapQuote = await jupiterQuoteApi.quoteGet(quoteParams);

  const withdrawAmount = nativeToUi(swapQuote.otherAmountThreshold, usdcBank.mintDecimals);
  const withdrawIx = await marginfiAccount.makeWithdrawIx(withdrawAmount, usdcBank.address);
  const { swapInstruction, addressLookupTableAddresses } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: swapQuote,
      userPublicKey: client.wallet.publicKey.toBase58(),
    },
  });
  const swapIx = deserializeInstruction(swapInstruction);
  const depositIx = await marginfiAccount.makeRepayIx(usdtAmountToRepay, usdtBank.address, true);
 
  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];
  addressLookupTableAccounts.push(
    ...(await getAdressLookupTableAccounts(client.provider.connection, addressLookupTableAddresses))
  );

  const flashLoanTx = await marginfiAccount.buildFlashLoanTx({
    ixs: [...withdrawIx.instructions, swapIx, ...depositIx.instructions],
    addressLookupTableAccounts,
  });

  await client.processTransaction(flashLoanTx);
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
