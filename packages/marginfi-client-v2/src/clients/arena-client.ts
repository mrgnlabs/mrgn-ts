import { AddressLookupTableAccount, PublicKey, TransactionSignature } from "@solana/web3.js";

import { BankMetadataMap, SolanaTransaction, TransactionOptions, Wallet } from "@mrgnlabs/mrgn-common";

import { MarginfiGroup } from "../models/group";
import { MarginfiConfig, MarginfiProgram } from "../types";
import { PythPushFeedIdMap } from "../utils";
import { ProcessTransactionStrategy, ProcessTransactionsClientOpts } from "../services";
import { MarginfiClient, BankMap, OraclePriceMap, MintDataMap } from "..";

class ArenaClient extends MarginfiClient {
  constructor(
    config: MarginfiConfig,
    program: MarginfiProgram,
    wallet: Wallet,
    isReadOnly: boolean,
    group: MarginfiGroup,
    banks: BankMap,
    priceInfos: OraclePriceMap,
    mintDatas: MintDataMap,
    feedIdMap: PythPushFeedIdMap,
    addressLookupTables?: AddressLookupTableAccount[],
    preloadedBankAddresses?: PublicKey[],
    bankMetadataMap?: BankMetadataMap,
    bundleSimRpcEndpoint?: string,
    processTransactionStrategy?: ProcessTransactionStrategy,
    lookupTablesAddresses?: PublicKey[]
  ) {
    super(
      config,
      program,
      wallet,
      isReadOnly,
      group,
      banks,
      priceInfos,
      mintDatas,
      feedIdMap,
      addressLookupTables,
      preloadedBankAddresses,
      bankMetadataMap,
      bundleSimRpcEndpoint,
      processTransactionStrategy,
      lookupTablesAddresses
    );
  }

  async processTransaction(
    transaction: SolanaTransaction,
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature> {
    try {
      await fetch("/api/processTransaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error processing transaction to the backend:", error);
    }

    return super.processTransaction(transaction, { ...processOpts, addArenaTxTag: true }, txOpts);
  }

  async processTransactions(
    transactions: SolanaTransaction[],
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature[]> {
    try {
      await fetch("/api/processTransaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error processing transaction to the backend:", error);
    }

    return super.processTransactions(transactions, { ...processOpts, addArenaTxTag: true }, txOpts);
  }
}

export default ArenaClient;
