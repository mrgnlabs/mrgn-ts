// import { Address, AnchorProvider, BorshAccountsCoder, Program, translateAddress } from "@coral-xyz/anchor";
// import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
// import {
//   AddressLookupTableAccount,
//   Commitment,
//   ConfirmOptions,
//   Connection,
//   Keypair,
//   PublicKey,
//   SendTransactionError,
//   Signer,
//   Transaction,
//   TransactionInstruction,
//   TransactionMessage,
//   TransactionSignature,
//   VersionedTransaction,
// } from "@solana/web3.js";
// import { AccountType, Environment, MarginfiConfig, MarginfiProgram } from "../types";
// import { getConfig } from "../config";
// import instructions from "../instructions";
// import { MarginRequirementType } from "../models/account";
// import {
//   addTransactionMetadata,
//   BankMetadataMap,
//   chunkedGetRawMultipleAccountInfoOrdered,
//   DEFAULT_COMMITMENT,
//   InstructionsWrapper,
//   isV0Tx,
//   loadBankMetadatas,
//   loadKeypair,
//   NodeWallet,
//   SolanaTransaction,
//   TransactionOptions,
//   Wallet,
// } from "@mrgnlabs/mrgn-common";
// import { MarginfiGroup } from "../models/group";
// import {
//   BankRaw,
//   parseOracleSetup,
//   parsePriceInfo,
//   Bank,
//   OraclePrice,
//   ADDRESS_LOOKUP_TABLE_FOR_GROUP,
//   MarginfiAccountRaw,
//   MARGINFI_IDL,
//   MarginfiIdlType,
//   BankConfigOpt,
//   BankConfig,
// } from "..";
// import { MarginfiAccountWrapper } from "../models/account/wrapper";
// import {
//   ProcessTransactionError,
//   ProcessTransactionErrorType,
//   parseErrorFromLogs,
//   parseTransactionError,
// } from "../errors";
// import { findOracleKey, makePriorityFeeIx, PythPushFeedIdMap, buildFeedIdMap } from "../utils";
// import {
//   ProcessTransactionOpts,
//   ProcessTransactionStrategy,
//   ProcessTransactionsClientOpts,
//   processTransactions,
// } from "../services";
// import { BundleSimulationError, simulateBundle } from "../services/transaction/helpers";

// export type BankMap = Map<string, Bank>;
// export type OraclePriceMap = Map<string, OraclePrice>;
// export type MintDataMap = Map<string, MintData>;

// export type MintData = {
//   mint: PublicKey;
//   tokenProgram: PublicKey;
//   feeBps: number; // TODO: Handle this in calcs
//   emissionTokenProgram: PublicKey | null;
// };

// export type MarginfiClientOptions = {
//   confirmOpts?: ConfirmOptions;
//   readOnly?: boolean;
//   preloadedBankAddresses?: PublicKey[];
//   bundleSimRpcEndpoint?: string;
//   processTransactionStrategy?: ProcessTransactionStrategy;
//   bankMetadataMap?: BankMetadataMap;
//   fetchGroupDataOverride?: (
//     program: MarginfiProgram,
//     groupAddress: PublicKey,
//     commitment?: Commitment,
//     bankAddresses?: PublicKey[],
//     bankMetadataMap?: BankMetadataMap
//   ) => Promise<{
//     marginfiGroup: MarginfiGroup;
//     banks: Map<string, Bank>;
//     priceInfos: Map<string, OraclePrice>;
//     tokenDatas: Map<string, MintData>;
//     feedIdMap: PythPushFeedIdMap;
//   }>;
// };

// /**
//  * Entrypoint to interact with the marginfi contract.
//  */
// class ArenaClient {
//   public group: MarginfiGroup;
//   public banks: BankMap;
//   public oraclePrices: OraclePriceMap;
//   public mintDatas: MintDataMap;
//   public addressLookupTables: AddressLookupTableAccount[];
//   public feedIdMap: PythPushFeedIdMap;
//   private preloadedBankAddresses?: PublicKey[];
//   private bundleSimRpcEndpoint: string;
//   private processTransactionStrategy?: ProcessTransactionStrategy;

//   // --------------------------------------------------------------------------
//   // Factories
//   // --------------------------------------------------------------------------

//   constructor(
//     readonly config: MarginfiConfig,
//     readonly program: MarginfiProgram,
//     readonly wallet: Wallet,
//     readonly isReadOnly: boolean,
//     group: MarginfiGroup,
//     banks: BankMap,
//     priceInfos: OraclePriceMap,
//     mintDatas: MintDataMap,
//     feedIdMap: PythPushFeedIdMap,
//     addressLookupTables?: AddressLookupTableAccount[],
//     preloadedBankAddresses?: PublicKey[],
//     readonly bankMetadataMap?: BankMetadataMap,
//     bundleSimRpcEndpoint?: string,
//     processTransactionStrategy?: ProcessTransactionStrategy
//   ) {
//     this.group = group;
//     this.banks = banks;
//     this.oraclePrices = priceInfos;
//     this.mintDatas = mintDatas;
//     this.addressLookupTables = addressLookupTables ?? [];
//     this.preloadedBankAddresses = preloadedBankAddresses;
//     this.feedIdMap = feedIdMap;
//     this.bundleSimRpcEndpoint = bundleSimRpcEndpoint ?? program.provider.connection.rpcEndpoint;
//     this.processTransactionStrategy = processTransactionStrategy;
//   }

//   /**
//    * MarginfiClient factory
//    *
//    * Fetch account data according to the config and instantiate the corresponding MarginfiAccount.
//    *
//    * @param config marginfi config
//    * @param wallet User wallet (used to pay fees and sign transactions)
//    * @param connection Solana web.js Connection object
//    * @returns MarginfiClient instance
//    */
//   static async fetch(
//     config: MarginfiConfig,
//     wallet: Wallet,
//     connection: Connection,
//     clientOptions?: MarginfiClientOptions
//   ) {
//     const debug = require("debug")("mfi:client");
//     debug(
//       "Loading Marginfi Client\n\tprogram: %s\n\tenv: %s\n\tgroup: %s\n\turl: %s",
//       config.programId,
//       config.environment,
//       config.groupPk,
//       connection.rpcEndpoint
//     );

//     const confirmOpts = clientOptions?.confirmOpts ?? {};
//     const readOnly = clientOptions?.readOnly ?? false;
//     const preloadedBankAddresses = clientOptions?.preloadedBankAddresses;

//     const provider = new AnchorProvider(connection, wallet, {
//       ...AnchorProvider.defaultOptions(),
//       commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
//       ...confirmOpts,
//     });

//     const idl = { ...(MARGINFI_IDL as unknown as MarginfiIdlType), address: config.programId.toBase58() };

//     const program = new Program(idl, provider) as any as MarginfiProgram;

//     let bankMetadataMap: BankMetadataMap | undefined = clientOptions?.bankMetadataMap;
//     try {
//       if (!bankMetadataMap) {
//         bankMetadataMap = await loadBankMetadatas();
//       }
//     } catch (error) {
//       console.error("Failed to load bank metadatas. Convenience getter by symbol will not be available", error);
//     }

//     const fetchGroupData = clientOptions?.fetchGroupDataOverride ?? MarginfiClient.fetchGroupData;

//     const { marginfiGroup, banks, priceInfos, tokenDatas, feedIdMap } = await fetchGroupData(
//       program,
//       config.groupPk,
//       connection.commitment,
//       preloadedBankAddresses,
//       bankMetadataMap
//     );

//     let addressLookupTableAddresses = ADDRESS_LOOKUP_TABLE_FOR_GROUP[config.groupPk.toString()];

//     if (!addressLookupTableAddresses) {
//       try {
//         const response = await fetch(`https://storage.googleapis.com/mrgn-public/mrgn-lut-cache.json`, {
//           headers: {
//             Accept: "application/json",
//           },
//           method: "GET",
//         });

//         if (response.status === 200) {
//           const parsedResponse = await response.json();
//           if (!parsedResponse) throw new Error("JSON is mia");
//           const lookupTableString = parsedResponse[config.groupPk.toString()];
//           if (!parsedResponse) throw new Error("Group not found");
//           addressLookupTableAddresses = [new PublicKey(lookupTableString)];
//         } else {
//           throw new Error("LUT not found");
//         }
//       } catch (error) {
//         addressLookupTableAddresses = [];
//       }
//     }

//     debug("Fetching address lookup tables for %s", addressLookupTableAddresses);
//     const addressLookupTables = (
//       await Promise.all(addressLookupTableAddresses.map((address) => connection.getAddressLookupTable(address)))
//     )
//       .map((response) => response!.value)
//       .filter((table) => table !== null) as AddressLookupTableAccount[];

//     return new MarginfiClient(
//       config,
//       program,
//       wallet,
//       readOnly,
//       marginfiGroup,
//       banks,
//       priceInfos,
//       tokenDatas,
//       feedIdMap,
//       addressLookupTables,
//       preloadedBankAddresses,
//       bankMetadataMap,
//       clientOptions?.bundleSimRpcEndpoint,
//       clientOptions?.processTransactionStrategy
//     );
//   }

//   get groupAddress(): PublicKey {
//     return this.config.groupPk;
//   }

//   get provider(): AnchorProvider {
//     return this.program.provider as AnchorProvider;
//   }

//   get programId(): PublicKey {
//     return this.program.programId;
//   }
// }

// export default ArenaClient;
