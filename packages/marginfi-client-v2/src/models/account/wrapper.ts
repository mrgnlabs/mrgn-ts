import {
  Amount,
  DEFAULT_COMMITMENT,
  InstructionsWrapper,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  Wallet,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  shortenAddress,
  TransactionBroadcastType,
  addTransactionMetadata,
  TransactionOptions,
  ExtendedTransaction,
  ExtendedV0Transaction,
  getTxSize,
  getAccountKeys,
  WSOL_MINT,
  STAKE_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  SYSVAR_CLOCK_ID,
  BankMetadataMap,
  TransactionType,
} from "@mrgnlabs/mrgn-common";
import * as sb from "@switchboard-xyz/on-demand";
import { Address, BorshCoder, Idl, translateAddress } from "@coral-xyz/anchor";
import {
  AccountMeta,
  Commitment,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  Signer,
  AddressLookupTableAccount,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  Keypair,
  TransactionSignature,
  StakeAuthorizationLayout,
  StakeProgram,
  Connection,
  ParsedAccountData,
} from "@solana/web3.js";
import { NATIVE_MINT, Token } from "@solana/spl-token";
import BigNumber from "bignumber.js";
import {
  LoopTxProps,
  MakeBorrowIxOpts,
  MakeDepositIxOpts,
  makePriorityFeeIx,
  MakeRepayIxOpts,
  MakeWithdrawIxOpts,
  MarginfiClient,
  MarginfiGroup,
  MarginfiIdlType,
  OracleSetup,
  ProcessTransactionsClientOpts,
  RepayWithCollateralProps,
  FlashloanActionResult,
  LoopProps,
  TransactionBuilderResult,
  makeUnwrapSolIx,
  computeLoopingParams,
  makeWrapSolIxs,
  MarginfiAccountRaw,
  EmodeTag,
  EmodePair,
  ActionEmodeImpact,
} from "../..";
import { AccountType, MarginfiConfig, MarginfiProgram } from "../../types";
import { MarginfiAccount, MarginRequirementType } from "./pure";
import { Bank } from "../bank";
import { Balance } from "../balance";
import {
  findPoolAddress,
  findPoolMintAddress,
  findPoolMintAuthorityAddress,
  findPoolStakeAddress,
  findPoolStakeAuthorityAddress,
  getSwitchboardProgram,
  SinglePoolInstruction,
} from "../../vendor";
import instructions from "../../instructions";

// Temporary imports
export const MAX_TX_SIZE = 1232;
export const MAX_ACCOUNT_KEYS = 64;
export const BUNDLE_TX_SIZE = 81;
export const PRIORITY_TX_SIZE = 44;

export interface SimulationResult {
  banks: Map<string, Bank>;
  marginfiAccount: MarginfiAccountWrapper;
}

export interface FlashLoanArgs {
  ixs: TransactionInstruction[];
  signers?: Signer[];
  addressLookupTableAccounts?: AddressLookupTableAccount[];
  blockhash?: string;
}

class MarginfiAccountWrapper {
  public readonly address: PublicKey;

  private _marginfiAccount: MarginfiAccount;

  // --------------------------------------------------------------------------
  // Factories
  // --------------------------------------------------------------------------

  /**
   * @internal
   */
  constructor(
    marginfiAccountPk: PublicKey,
    readonly client: MarginfiClient,
    marginfiAccount: MarginfiAccount
  ) {
    this.address = marginfiAccountPk;
    this._marginfiAccount = marginfiAccount;
  }

  static async fetch(
    marginfiAccountPk: Address,
    client: MarginfiClient,
    commitment?: Commitment
  ): Promise<MarginfiAccountWrapper> {
    const { config, program } = client;
    const _marginfiAccountPk = translateAddress(marginfiAccountPk);

    const accountData = await MarginfiAccountWrapper._fetchAccountData(_marginfiAccountPk, config, program, commitment);
    const marginfiAccount = MarginfiAccount.fromAccountParsed(_marginfiAccountPk, accountData);

    const marginfiAccountProxy = new MarginfiAccountWrapper(_marginfiAccountPk, client, marginfiAccount);

    require("debug")("mfi:margin-account")("Loaded marginfi account %s", _marginfiAccountPk);

    return marginfiAccountProxy;
  }

  static fromAccountParsed(marginfiAccountPk: Address, client: MarginfiClient, accountData: MarginfiAccountRaw) {
    if (!accountData.group.equals(client.config.groupPk))
      throw Error(
        `Marginfi account tied to group ${accountData.group.toBase58()}. Expected: ${client.config.groupPk.toBase58()}`
      );

    const _marginfiAccountPk = translateAddress(marginfiAccountPk);
    const marginfiAccount = MarginfiAccount.fromAccountParsed(_marginfiAccountPk, accountData);
    return new MarginfiAccountWrapper(_marginfiAccountPk, client, marginfiAccount);
  }

  static fromAccountDataRaw(
    marginfiAccountPk: PublicKey,
    client: MarginfiClient,
    marginfiAccountRawData: Buffer,
    idl: MarginfiIdlType
  ) {
    const marginfiAccountData = MarginfiAccount.decode(marginfiAccountRawData, idl);
    return MarginfiAccountWrapper.fromAccountParsed(marginfiAccountPk, client, marginfiAccountData);
  }

  // --------------------------------------------------------------------------
  // Attributes
  // --------------------------------------------------------------------------

  get authority(): PublicKey {
    return this._marginfiAccount.authority;
  }

  get group(): MarginfiGroup {
    return this.client.group;
  }

  get balances(): Balance[] {
    return this._marginfiAccount.balances;
  }

  get data(): MarginfiAccount {
    return this._marginfiAccount;
  }

  get pureAccount(): MarginfiAccount {
    return this._marginfiAccount;
  }

  /** @internal */
  private get _program() {
    return this.client.program;
  }

  /** @internal */
  private get _config() {
    return this.client.config;
  }

  get activeBalances(): Balance[] {
    return this._marginfiAccount.balances.filter((la) => la.active);
  }

  get isDisabled(): boolean {
    return this._marginfiAccount.isDisabled;
  }

  get isFlashLoanEnabled(): boolean {
    return this._marginfiAccount.isFlashLoanEnabled;
  }

  get isTransferAccountAuthorityEnabled(): boolean {
    return this._marginfiAccount.isTransferAccountAuthorityEnabled;
  }

  public getBalance(bankPk: PublicKey): Balance {
    return this._marginfiAccount.getBalance(bankPk);
  }

  public async simulateHealthCache(): Promise<MarginfiAccountWrapper> {
    const { marginfiAccount: account } = await this._marginfiAccount.simulateHealthCache(
      this._program,
      this.client.banks,
      this.client.oraclePrices,
      this.client.bankMetadataMap ?? {}
    );
    return new MarginfiAccountWrapper(this.address, this.client, account);
  }

  public canBeLiquidated(): boolean {
    const debugLogger = require("debug")(`mfi:margin-account:${this.address.toString()}:canBeLiquidated`);
    const { assets, liabilities } = this._marginfiAccount.computeHealthComponents(MarginRequirementType.Maintenance);

    debugLogger(
      "Account %s, maint assets: %s, maint liabilities: %s, maint healt: %s",
      this.address,
      assets,
      liabilities
    );

    return assets.lt(liabilities);
  }

  public computeHealthComponents(marginRequirement: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return this._marginfiAccount.computeHealthComponents(marginRequirement);
  }

  public computeHealthComponentsLegacy(marginRequirement: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return this._marginfiAccount.computeHealthComponentsLegacy(
      this.client.banks,
      this.client.oraclePrices,
      marginRequirement
    );
  }

  public computeHealthComponentsWithoutBiasLegacy(marginRequirement: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return this._marginfiAccount.computeHealthComponentsWithoutBiasLegacy(
      this.client.banks,
      this.client.oraclePrices,
      marginRequirement
    );
  }

  public computeFreeCollateral(opts?: { clamped?: boolean }): BigNumber {
    return this._marginfiAccount.computeFreeCollateral(opts);
  }

  public computeAccountValue(): BigNumber {
    return this._marginfiAccount.computeAccountValue();
  }

  public computeActiveEmodePairs(emodePairs: EmodePair[]): EmodePair[] {
    return this._marginfiAccount.computeActiveEmodePairs(emodePairs);
  }

  public computeEmodeImpacts(emodePairs: EmodePair[]): Record<string, ActionEmodeImpact> {
    return this._marginfiAccount.computeEmodeImpacts(
      emodePairs,
      Array.from(this.client.banks.keys()).map((b) => new PublicKey(b))
    );
  }

  public computeMaxBorrowForBank(
    bankAddress: PublicKey,
    opts?: {
      volatilityFactor?: number;
      emodeWeights?: { assetWeightMaint: BigNumber; assetWeightInit: BigNumber; collateralTag: EmodeTag };
    }
  ): BigNumber {
    return this._marginfiAccount.computeMaxBorrowForBank(
      this.client.banks,
      this.client.oraclePrices,
      bankAddress,
      opts
    );
  }

  public computeMaxWithdrawForBank(bankAddress: PublicKey, opts?: { volatilityFactor?: number }): BigNumber {
    return this._marginfiAccount.computeMaxWithdrawForBank(
      this.client.banks,
      this.client.oraclePrices,
      bankAddress,
      opts
    );
  }

  public computeMaxLiquidatableAssetAmount(assetBankAddress: PublicKey, liabilityBankAddress: PublicKey): BigNumber {
    return this._marginfiAccount.computeMaxLiquidatableAssetAmount(
      this.client.banks,
      this.client.oraclePrices,
      assetBankAddress,
      liabilityBankAddress
    );
  }

  public computeLiquidationPriceForBank(bankAddress: PublicKey): number | null {
    return this._marginfiAccount.computeLiquidationPriceForBank(
      this.client.banks,
      this.client.oraclePrices,
      bankAddress
    );
  }

  public computeLiquidationPriceForBankAmount(
    bankAddress: PublicKey,
    isLending: boolean,
    amount: number
  ): number | null {
    return this._marginfiAccount.computeLiquidationPriceForBankAmount(
      this.client.banks,
      this.client.oraclePrices,
      bankAddress,
      isLending,
      amount
    );
  }

  public computeNetApy(): number {
    return this._marginfiAccount.computeNetApy(this.client.banks, this.client.oraclePrices);
  }

  /** Todo move this into client */
  public computeLoopingParams(
    principal: Amount,
    targetLeverage: number,
    depositBankAddress: PublicKey,
    borrowBankAddress: PublicKey
  ): { borrowAmount: BigNumber; totalDepositAmount: BigNumber } {
    const depositBank = this.client.banks.get(depositBankAddress.toBase58());
    if (!depositBank) throw Error(`Bank ${depositBankAddress.toBase58()} not found`);
    const depositPriceInfo = this.client.oraclePrices.get(depositBankAddress.toBase58());
    if (!depositPriceInfo) throw Error(`Price info for ${depositBankAddress.toBase58()} not found`);

    const borrowBank = this.client.banks.get(borrowBankAddress.toBase58());
    if (!borrowBank) throw Error(`Bank ${borrowBankAddress.toBase58()} not found`);
    const borrowPriceInfo = this.client.oraclePrices.get(borrowBankAddress.toBase58());
    if (!borrowPriceInfo) throw Error(`Price info for ${borrowBankAddress.toBase58()} not found`);

    return computeLoopingParams(principal, targetLeverage, depositBank, borrowBank, depositPriceInfo, borrowPriceInfo);
  }

  makeComputeBudgetIx(): TransactionInstruction[] {
    // Add additional CU request if necessary
    let cuRequestIxs: TransactionInstruction[] = [];
    const activeBalances = this.balances.filter((b) => b.active);
    if (activeBalances.length >= 4) {
      cuRequestIxs.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }));
    }

    return cuRequestIxs;
  }

  // --------------------------------------------------------------------------
  // User actions
  // --------------------------------------------------------------------------

  async makeSetupIx(banks: PublicKey[]) {
    this._marginfiAccount.authority;

    if (this.client.bankMetadataMap === undefined) {
      return [];
    }

    try {
      const userAtas = banks.map((bankAddress) => {
        const bank = this.client.bankMetadataMap![bankAddress.toBase58()];
        const mintData = this.client.mintDatas.get(bankAddress.toBase58());
        if (!mintData) throw Error(`Token data for ${bank.tokenAddress} not found`);
        return getAssociatedTokenAddressSync(
          new PublicKey(bank.tokenAddress),
          this.authority,
          true,
          mintData.tokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : undefined
        );
      });

      let ixs = [];
      const userAtaAis = await this._program.provider.connection.getMultipleAccountsInfo(userAtas);

      for (const [i, userAta] of userAtaAis.entries()) {
        if (userAta === null) {
          const bankAddress = banks[i];
          const bank = this.client.bankMetadataMap![bankAddress.toBase58()];
          const mintData = this.client.mintDatas.get(bankAddress.toBase58());
          if (!mintData) throw Error(`Token data for ${bank.tokenAddress} not found`);
          ixs.push(
            createAssociatedTokenAccountIdempotentInstruction(
              this.authority,
              userAtas[i],
              this.authority,
              new PublicKey(bank.tokenAddress),
              mintData.tokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : undefined
            )
          );
        }
      }

      return ixs;
    } catch {
      return [];
    }
  }

  /**
   * Moves a position from one marginfi account to another by withdrawing from source account and depositing to destination account.
   *
   * @param amount - The amount of tokens to move, can be a number or Amount object
   * @param bankAddress - The public key of the bank to move position from/to
   * @param destinationAccount - The marginfi account to move the position to
   * @param processOpts - Optional transaction processing configuration
   * @param txOpts - Optional transaction options
   * @returns Array of transaction signatures - includes signatures for any required oracle feed updates, withdraw transaction, and deposit transaction
   */
  async movePosition(
    amount: Amount,
    bankAddress: PublicKey,
    destinationAccountPk: PublicKey,
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature[]> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:move-position`);
    debug("Moving position from %s marginfi account", this.address.toBase58());

    const { transactions, actionTxIndex } = await this.makeMovePositionTx(amount, bankAddress, destinationAccountPk);

    const sigs = await this.client.processTransactions(transactions, processOpts, txOpts);

    debug("Moving position successful %s", sigs[sigs.length - 1]);
    return sigs;
  }

  /**
   * Creates transactions for moving a position from one marginfi account to another.
   *
   * @param amount - The amount of tokens to move, can be a number or Amount object
   * @param bankAddress - The public key of the bank to move position from/to
   * @param destinationAccount - The marginfi account to move the position to
   * @returns Object containing feed crank transactions, withdraw transaction, and deposit transaction
   */
  async makeMovePositionTx(
    amount: Amount,
    bankAddress: PublicKey,
    destinationAccountPk: PublicKey
  ): Promise<TransactionBuilderResult> {
    const cuRequestIxs = this.makeComputeBudgetIx();
    const { instructions: updateFeedIxs, luts: feedLuts } = await this.makeUpdateFeedIx([]);
    const withdrawIxs = await this.makeWithdrawIx(amount, bankAddress, true);

    const {
      value: { blockhash },
    } = await this._program.provider.connection.getLatestBlockhashAndContext("confirmed");

    let feedCrankTxs: ExtendedV0Transaction[] = [];

    if (updateFeedIxs.length > 0) {
      feedCrankTxs.push(
        addTransactionMetadata(
          new VersionedTransaction(
            new TransactionMessage({
              instructions: [...updateFeedIxs],
              payerKey: this.authority,
              recentBlockhash: blockhash,
            }).compileToV0Message(feedLuts)
          ),
          {
            addressLookupTables: feedLuts,
            type: TransactionType.CRANK,
          }
        )
      );
    }

    const lookupTables = await getClientAddressLookupTableAccounts(this.client);

    const withdrawTx = addTransactionMetadata(
      new VersionedTransaction(
        new TransactionMessage({
          instructions: [...cuRequestIxs, ...withdrawIxs.instructions],
          payerKey: this.authority,
          recentBlockhash: blockhash,
        }).compileToV0Message(lookupTables)
      ),
      {
        signers: withdrawIxs.keys,
        addressLookupTables: lookupTables,
        type: TransactionType.MOVE_POSITION_WITHDRAW,
      }
    );

    const destinationAccount = await MarginfiAccountWrapper.fetch(destinationAccountPk, this.client);

    const depositIx = await destinationAccount.makeDepositIx(amount, bankAddress);
    const tx = new Transaction().add(...depositIx.instructions);
    const depositTx = addTransactionMetadata(tx, {
      signers: depositIx.keys,
      addressLookupTables: lookupTables,
      type: TransactionType.MOVE_POSITION_DEPOSIT,
    });

    const transactions = [...feedCrankTxs, withdrawTx, depositTx];

    return { transactions, actionTxIndex: transactions.length - 1 };
  }

  /**
   * Repays a loan using collateral from another bank by:
   * 1. Withdrawing collateral from one bank
   * 2. Swapping it to the repayment asset
   * 3. Repaying the loan in another bank
   *
   * @param {RepayWithCollateralProps} props - Parameters for the repay with collateral transaction
   * @param {Amount} props.repayAmount - Amount to repay
   * @param {Amount} props.withdrawAmount - Amount of collateral to withdraw
   * @param {PublicKey} props.borrowBankAddress - Bank address where the loan is being repaid
   * @param {PublicKey} props.depositBankAddress - Bank address where collateral is being withdrawn from
   * @param {boolean} [props.withdrawAll=false] - Whether to withdraw all collateral from deposit bank
   * @param {boolean} [props.repayAll=false] - Whether to repay entire loan amount
   * @param {Object} props.swap - Swap configuration with instructions and lookup tables
   * @param {ProcessTransactionsClientOpts} [props.processOpts] - Optional transaction processing configuration
   * @param {TransactionOptions} [props.txOpts] - Optional transaction options
   * @returns {Promise<TransactionSignature[]>} Array of transaction signatures
   */
  async repayWithCollatV2(props: RepayWithCollateralProps): Promise<TransactionSignature[]> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:repay`);
    debug(
      "Repaying %s into marginfi account (bank: %s), repay all: %s",
      props.repayAmount,
      props.borrowBankAddress,
      props.repayAll
    );

    const { processOpts, txOpts, ...txProps } = props;
    const { transactions, actionTxIndex } = await this.makeRepayWithCollatTxV2({
      ...txProps,
    });

    const sigs = await this.client.processTransactions(transactions, processOpts, txOpts);
    debug("Repay with collateral successful %s", sigs[sigs.length - 1] ?? "");

    return sigs;
  }

  /**
   * Creates a transaction to repay a loan using collateral by:
   * 1. Withdrawing collateral from one bank
   * 2. Swapping it to the repayment asset
   * 3. Repaying the loan in another bank
   *
   * @param {RepayWithCollateralProps} params - Parameters for the repay with collateral transaction
   * @param {Amount} params.repayAmount - Amount to repay
   * @param {Amount} params.withdrawAmount - Amount of collateral to withdraw
   * @param {PublicKey} params.borrowBankAddress - Bank address where the loan is being repaid
   * @param {PublicKey} params.depositBankAddress - Bank address where collateral is being withdrawn from
   * @param {boolean} [params.withdrawAll=false] - Whether to withdraw all collateral from deposit bank
   * @param {boolean} [params.repayAll=false] - Whether to repay entire loan amount
   * @param {Object} params.swap - Swap configuration with instructions and lookup tables
   * @param {string} [params.blockhash] - Optional recent blockhash
   * @param {MakeWithdrawIxOpts} [params.withdrawOpts] - Optional withdraw configuration
   * @param {MakeRepayIxOpts} [params.repayOpts] - Optional repay configuration
   * @returns {Promise<RepayWithCollateralResult>} Result containing feed crank and flashloan transactions
   */
  async makeRepayWithCollatTxV2({
    repayAmount,
    withdrawAmount,
    borrowBankAddress,
    depositBankAddress,
    withdrawAll = false,
    repayAll = false,
    swap,
    blockhash: blockhashArg,
  }: RepayWithCollateralProps): Promise<FlashloanActionResult> {
    const blockhash =
      blockhashArg ?? (await this._program.provider.connection.getLatestBlockhash("confirmed")).blockhash;

    // creates atas if needed
    const setupIxs = await this.makeSetupIx([borrowBankAddress, depositBankAddress]);
    const cuRequestIxs =
      this.makeComputeBudgetIx().length > 0
        ? this.makeComputeBudgetIx()
        : [ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 })];
    // tiny priority fee just in case bundle fails
    const [priorityFeeIx] = makePriorityFeeIx(0.00001);
    const withdrawIxs = await this.makeWithdrawIx(withdrawAmount, depositBankAddress, withdrawAll, {
      createAtas: false,
      wrapAndUnwrapSol: false,
    });
    const repayIxs = await this.makeRepayIx(repayAmount, borrowBankAddress, repayAll, {
      wrapAndUnwrapSol: false,
    });
    const { instructions: updateFeedIxs, luts: feedLuts } = await this.makeUpdateFeedIx([
      depositBankAddress,
      borrowBankAddress,
    ]);
    const { lookupTables: swapLookupTables, instructions: swapIxs } = swap;

    let additionalTxs: ExtendedV0Transaction[] = [];
    let flashloanTx: ExtendedV0Transaction;
    let txOverflown = false;

    // if atas are needed, add them
    if (setupIxs.length > 0) {
      const message = new TransactionMessage({
        payerKey: this.client.wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: setupIxs,
      }).compileToLegacyMessage();

      additionalTxs.push(
        addTransactionMetadata(new VersionedTransaction(message), {
          type: TransactionType.CREATE_ATA,
        })
      );
    }

    // if crank is needed, add it
    if (updateFeedIxs.length > 0) {
      const message = new TransactionMessage({
        payerKey: this.client.wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: updateFeedIxs,
      }).compileToV0Message(feedLuts);

      additionalTxs.push(
        addTransactionMetadata(new VersionedTransaction(message), {
          addressLookupTables: feedLuts,
          type: TransactionType.CRANK,
        })
      );
    }

    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);

    const addressLookupTableAccounts = [...clientLookupTables, ...swapLookupTables];

    // if cuRequestIxs are not present, priority fee ix is needed
    // wallets add a priority fee ix by default breaking the flashloan tx so we need to add a placeholder priority fee ix
    // docs: https://docs.phantom.app/developer-powertools/solana-priority-fees
    flashloanTx = await this.buildFlashLoanTx({
      ixs: [...cuRequestIxs, priorityFeeIx, ...withdrawIxs.instructions, ...swapIxs, ...repayIxs.instructions],
      addressLookupTableAccounts,
      blockhash,
    });

    const txSize = getTxSize(flashloanTx);
    const accountKeys = getAccountKeys(flashloanTx, addressLookupTableAccounts);
    const txToManyKeys = accountKeys > MAX_ACCOUNT_KEYS;
    const txToBig = txSize > MAX_TX_SIZE;
    const canBeDownsized = txToManyKeys && txToBig && txSize - PRIORITY_TX_SIZE <= MAX_TX_SIZE;

    if (canBeDownsized) {
      // wallets won't add a priority fee if tx space is limited
      // this will decrease landing rate for non-rpc calls
      flashloanTx = await this.buildFlashLoanTx({
        ixs: [...cuRequestIxs, ...withdrawIxs.instructions, ...swapIxs, ...repayIxs.instructions],
        addressLookupTableAccounts,
        blockhash,
      });

      const txSize = getTxSize(flashloanTx);
      const txToBig = txSize > MAX_TX_SIZE;

      // this shouldn't trigger, but just in case
      if (txToBig) {
        txOverflown = true;
      }
    } else if (txToBig || txToManyKeys) {
      txOverflown = true;
    }

    flashloanTx = addTransactionMetadata(flashloanTx, {
      type: TransactionType.REPAY_COLLAT,
      addressLookupTables: flashloanTx.addressLookupTables,
    });

    const transactions = [...additionalTxs, flashloanTx];

    // TODO throw tx overflown error and cath
    return { transactions, actionTxIndex: transactions.length - 1, txOverflown };
  }

  async loopV2(props: LoopProps): Promise<TransactionSignature[]> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:repay`);
    debug(
      `Looping ${props.depositAmount} ${props.depositBankAddress.toBase58()} against ${
        props.borrowAmount
      } ${props.borrowBankAddress.toBase58()} into marginfi account (banks: ${props.depositBankAddress.toBase58()} / ${props.borrowBankAddress.toBase58()})`
    );

    const depositBank = this.client.banks.get(props.depositBankAddress.toBase58());
    if (!depositBank) throw Error("Deposit bank not found");
    const borrowBank = this.client.banks.get(props.borrowBankAddress.toBase58());
    if (!borrowBank) throw Error("Borrow bank not found");

    const { processOpts, txOpts, ...txProps } = props;

    const { transactions, actionTxIndex } = await this.makeLoopTxV2(txProps);

    const sigs = await this.client.processTransactions(transactions, processOpts, txOpts);
    debug("Loop successful %s", sigs[sigs.length - 1] ?? "");

    return sigs;
  }

  async makeLoopTxV2({
    depositAmount,
    inputDepositAmount,
    borrowAmount,
    depositBankAddress,
    borrowBankAddress,
    swap,
    blockhash: blockhashArg,
    setupBankAddresses,
    overrideInferAccounts,
  }: LoopTxProps): Promise<FlashloanActionResult> {
    const depositBank = this.client.banks.get(depositBankAddress.toBase58());
    if (!depositBank) throw Error("Deposit bank not found");
    const borrowBank = this.client.banks.get(borrowBankAddress.toBase58());
    if (!borrowBank) throw Error("Borrow bank not found");

    const blockhash =
      blockhashArg ?? (await this._program.provider.connection.getLatestBlockhash("confirmed")).blockhash;

    // creates atas if needed
    const setupIxs = await this.makeSetupIx(setupBankAddresses ?? [borrowBankAddress, depositBankAddress]);
    const cuRequestIxs =
      this.makeComputeBudgetIx().length > 0
        ? this.makeComputeBudgetIx()
        : [ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 })];
    // tiny priority fee just in case bundle fails
    const [priorityFeeIx] = makePriorityFeeIx(0.00001);
    const borrowIxs = await this.makeBorrowIx(borrowAmount, borrowBankAddress, {
      createAtas: false,
      wrapAndUnwrapSol: false,
      overrideInferAccounts,
    });
    const depositIxs = await this.makeDepositIx(depositAmount, depositBankAddress, {
      wrapAndUnwrapSol: false,
      overrideInferAccounts,
    });

    // unwrap if deposit bank is native
    // const unwrapIx = depositBank.mint.equals(NATIVE_MINT) ? [makeUnwrapSolIx(this.authority)] : [];

    const { instructions: updateFeedIxs, luts: feedLuts } = await this.makeUpdateFeedIx([
      depositBankAddress,
      borrowBankAddress,
    ]);
    const { lookupTables: swapLookupTables, instructions: swapIxs } = swap;

    let additionalTxs: ExtendedV0Transaction[] = [];
    let flashloanTx: ExtendedV0Transaction;
    let txOverflown = false;

    // wrap sol if needed
    if (depositBank.mint.equals(NATIVE_MINT) && inputDepositAmount) {
      setupIxs.push(...makeWrapSolIxs(this.authority, new BigNumber(inputDepositAmount)));
    }

    // if atas are needed, add them
    if (setupIxs.length > 0) {
      const message = new TransactionMessage({
        payerKey: this.client.wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: setupIxs,
      }).compileToLegacyMessage();

      additionalTxs.push(
        addTransactionMetadata(new VersionedTransaction(message), {
          type: TransactionType.CREATE_ATA,
        })
      );
    }

    // if crank is needed, add it
    if (updateFeedIxs.length > 0) {
      const message = new TransactionMessage({
        payerKey: this.client.wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: updateFeedIxs,
      }).compileToV0Message(feedLuts);

      additionalTxs.push(
        addTransactionMetadata(new VersionedTransaction(message), {
          addressLookupTables: feedLuts,
          type: TransactionType.CRANK,
        })
      );
    }

    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);
    const addressLookupTableAccounts = [...clientLookupTables, ...swapLookupTables];

    // if cuRequestIxs are not present, priority fee ix is needed
    // wallets add a priority fee ix by default breaking the flashloan tx so we need to add a placeholder priority fee ix
    // docs: https://docs.phantom.app/developer-powertools/solana-priority-fees
    flashloanTx = await this.buildFlashLoanTx({
      ixs: [...cuRequestIxs, priorityFeeIx, ...borrowIxs.instructions, ...swapIxs, ...depositIxs.instructions],
      addressLookupTableAccounts,
      blockhash,
    });

    const txSize = getTxSize(flashloanTx);
    const accountKeys = getAccountKeys(flashloanTx, addressLookupTableAccounts);
    const txToManyKeys = accountKeys > MAX_ACCOUNT_KEYS;
    const txToBig = txSize > MAX_TX_SIZE;
    const canBeDownsized = txToManyKeys && txToBig && txSize - PRIORITY_TX_SIZE <= MAX_TX_SIZE;

    if (canBeDownsized) {
      // wallets won't add a priority fee if tx space is limited
      // this will decrease landing rate for non-rpc calls ...unwrapIx,
      flashloanTx = await this.buildFlashLoanTx({
        ixs: [...cuRequestIxs, ...borrowIxs.instructions, ...swapIxs, ...depositIxs.instructions],
        addressLookupTableAccounts,
        blockhash,
      });
      const txSize = getTxSize(flashloanTx);
      const txToBig = txSize > MAX_TX_SIZE;

      // this shouldn't trigger, but just in case
      if (txToBig) {
        txOverflown = true;
      }
    } else if (txToBig || txToManyKeys) {
      txOverflown = true;
    }

    flashloanTx = addTransactionMetadata(flashloanTx, {
      type: TransactionType.LOOP,
      addressLookupTables: flashloanTx.addressLookupTables,
    });

    const transactions = [...additionalTxs, flashloanTx];
    return { transactions, actionTxIndex: transactions.length - 1, txOverflown };
  }

  /**
   * Creates instructions for closing a marginfi account.
   * The account must have no active positions or balances to be closed.
   * Closing an account will return any remaining SOL to the fee payer.
   *
   * @returns An InstructionsWrapper containing the close account instruction
   */
  async makeCloseAccountIx(): Promise<InstructionsWrapper> {
    const ix = await instructions.makeCloseAccountIx(this._program, {
      marginfiAccount: this.address,
      feePayer: this.client.wallet.publicKey,
    });
    return { instructions: [ix], keys: [] };
  }

  /**
   * Closes a marginfi account. The account must have no active positions or balances to be closed.
   * Closing an account will return any remaining SOL to the fee payer.
   *
   * @param processOpts - Optional transaction processing configuration
   * @param txOpts - Optional transaction options
   * @returns The transaction signature of the close account operation
   */
  async closeAccount(
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature> {
    const tx = await this.makeCloseAccountTx();
    return this.client.processTransaction(tx, processOpts, txOpts);
  }

  /**
   * Creates a transaction for closing a marginfi account.
   * The account must have no active positions or balances to be closed.
   *
   * @returns A transaction configured to close the marginfi account
   */
  async makeCloseAccountTx(): Promise<ExtendedTransaction> {
    const ix = await this.makeCloseAccountIx();
    const tx = new Transaction().add(...ix.instructions);
    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);
    return addTransactionMetadata(tx, {
      signers: ix.keys,
      addressLookupTables: clientLookupTables,
      type: TransactionType.CLOSE_ACCOUNT,
    });
  }

  /**
   * Creates instructions for depositing tokens into a marginfi bank account.
   *
   * @param amount - The amount of tokens to deposit, can be a number or Amount object
   * @param bankAddress - The public key of the bank to deposit into
   * @param depositOpts - Optional deposit configuration parameters
   * @returns An InstructionsWrapper containing the deposit instructions
   */
  async makeDepositIx(
    amount: Amount,
    bankAddress: PublicKey,
    depositOpts: MakeDepositIxOpts = {}
  ): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeDepositIx(
      this._program,
      this.client.banks,
      this.client.mintDatas,
      amount,
      bankAddress,
      depositOpts
    );
  }

  /**
   * Creates a transaction for depositing native stake into a marginfi staked asset bank account.
   * - Split stake account if required
   * - Authorize stake account to single spl pool pogram
   * - Deposit stake into pool for LST
   * - Deposit LST into marginfi bank
   *
   * @param amount - The amount of tokens to deposit, can be a number or Amount object
   * @param bankAddress - The public key of the bank to deposit into
   * @param stakeAccountPk - The public key of the stake account to delegate
   * @param validator - The public key of the validator to delegate to
   * @param depositOpts - Optional deposit configuration parameters
   * @returns A transaction object ready to be signed and sent
   */
  async makeDepositStakedTx(
    amount: Amount,
    bankAddress: PublicKey,
    stakeAccountPk: PublicKey,
    validator: PublicKey,
    depositOpts: MakeDepositIxOpts = {}
  ): Promise<ExtendedTransaction> {
    // derive addresses
    const pool = findPoolAddress(validator);
    const poolStakeAddress = findPoolStakeAddress(pool);
    const lstMint = findPoolMintAddress(pool);
    const auth = findPoolStakeAuthorityAddress(pool);
    const lstAta = getAssociatedTokenAddressSync(lstMint, this.authority);

    // fetch account info
    const [lstAccInfo, stakeAccountInfo, stakeAccInfoParsed] = await Promise.all([
      this.client.provider.connection.getAccountInfo(lstAta),
      this._program.provider.connection.getAccountInfo(stakeAccountPk),
      this._program.provider.connection.getParsedAccountInfo(stakeAccountPk),
    ]);
    const stakeAccParsed = stakeAccInfoParsed?.value?.data as ParsedAccountData;

    // calculate amounts and thresholds
    const [rentExemptReserve, minimumDelegation] = await Promise.all([
      this._program.provider.connection.getMinimumBalanceForRentExemption(StakeProgram.space),
      this._program.provider.connection.getStakeMinimumDelegation().then((res) => {
        return Math.max(res.value, LAMPORTS_PER_SOL);
      }),
    ]);

    // calculate if full stake or requires splitting
    const amountLamports = Math.round(Number(amount) * LAMPORTS_PER_SOL);
    const stakeAccLamports = Number(stakeAccParsed.parsed.info.stake?.delegation?.stake ?? 0);
    const isFullStake = amountLamports >= stakeAccLamports;

    // calculate pool tokens
    const poolStakeAccLamports =
      (await this._program.provider.connection.getAccountInfo(poolStakeAddress))?.lamports ?? 0;
    const prePoolStake = Math.max(poolStakeAccLamports - minimumDelegation - rentExemptReserve, 0);

    const tokenSupply = parseInt((await this._program.provider.connection.getTokenSupply(lstMint)).value.amount, 10);
    const stakeAddedNative = Number(amount) * 1e9;

    const newPoolTokens =
      prePoolStake > 0 && tokenSupply > 0
        ? Math.floor((stakeAddedNative * tokenSupply) / prePoolStake)
        : stakeAddedNative;

    if (newPoolTokens <= 0) {
      throw new Error("Deposit too small or calculation error.");
    }

    // build instructions
    const instructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];

    // create ata if needed
    if (!lstAccInfo) {
      instructions.push(createAssociatedTokenAccountInstruction(this.authority, lstAta, this.authority, lstMint));
    }

    // handle stake splitting if needed
    let targetStakePubkey: PublicKey;
    if (!isFullStake) {
      const splitStakeAccount = Keypair.generate();
      signers.push(splitStakeAccount);
      targetStakePubkey = splitStakeAccount.publicKey;

      instructions.push(
        ...StakeProgram.split(
          {
            stakePubkey: stakeAccountPk,
            authorizedPubkey: this.authority,
            splitStakePubkey: splitStakeAccount.publicKey,
            lamports: amountLamports,
          },
          rentExemptReserve
        ).instructions
      );
    } else {
      targetStakePubkey = stakeAccountPk;
    }

    // authorization instructions
    const [authorizeStakerIx, authorizeWithdrawIx] = await Promise.all([
      StakeProgram.authorize({
        stakePubkey: targetStakePubkey,
        authorizedPubkey: this.authority,
        newAuthorizedPubkey: auth,
        stakeAuthorizationType: StakeAuthorizationLayout.Staker,
      }).instructions,
      StakeProgram.authorize({
        stakePubkey: targetStakePubkey,
        authorizedPubkey: this.authority,
        newAuthorizedPubkey: auth,
        stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
      }).instructions,
    ]);

    // fix SYSVAR_CLOCK_ID writability
    [authorizeStakerIx[0], authorizeWithdrawIx[0]].forEach((ix) => {
      ix.keys = ix.keys.map((key) => ({
        ...key,
        isWritable: key.pubkey.equals(SYSVAR_CLOCK_ID) ? false : key.isWritable,
      }));
    });

    instructions.push(...authorizeStakerIx, ...authorizeWithdrawIx);

    // deposit stake instructions
    const depositStakeIx = await SinglePoolInstruction.depositStake(pool, targetStakePubkey, lstAta, this.authority);

    // deposit bank instructions
    const marginfiDepositIxs = await this.makeDepositIx(newPoolTokens / 1e9, bankAddress, depositOpts);

    instructions.push(depositStakeIx, ...marginfiDepositIxs.instructions);

    // build transaction
    const transaction = new Transaction().add(...instructions);
    return addTransactionMetadata(transaction, {
      type: TransactionType.DEPOSIT_STAKE,
      signers: [...signers, ...marginfiDepositIxs.keys],
      addressLookupTables: this.client.addressLookupTables,
    });
  }

  async makeMergeStakeAccountsTx(
    stakeAccountSrc: PublicKey,
    stakeAccountDest: PublicKey
  ): Promise<ExtendedTransaction> {
    // Create the merge instruction
    const mergeInstruction = StakeProgram.merge({
      stakePubkey: stakeAccountDest, // Public key of the destination stake account
      sourceStakePubKey: stakeAccountSrc, // Public key of the source stake account
      authorizedPubkey: this.authority, // Public key of the stake authority
    });

    // Build the transaction
    const transaction = new Transaction().add(mergeInstruction);

    // Get client lookup tables for consistency with other functions
    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);

    return addTransactionMetadata(transaction, {
      type: TransactionType.MERGE_STAKE_ACCOUNTS,
      signers: [],
      addressLookupTables: clientLookupTables,
    });
  }

  /**
   * Deposits tokens into a marginfi bank account.
   *
   * @param amount - The amount of tokens to deposit, can be a number or Amount object
   * @param bankAddress - The public key of the bank to deposit into
   * @param depositOpts - Optional deposit configuration parameters
   * @param processOpts - Optional transaction processing configuration
   * @param txOpts - Optional transaction options
   * @returns The transaction signature of the deposit
   */
  async deposit(
    amount: Amount,
    bankAddress: PublicKey,
    depositOpts: MakeDepositIxOpts = {},
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:deposit`);
    debug("Depositing %s into marginfi account (bank: %s)", amount, shortenAddress(bankAddress));

    const tx = await this.makeDepositTx(amount, bankAddress, depositOpts);

    const sig = await this.client.processTransaction(tx, processOpts, txOpts);
    debug("Depositing successful %s", sig);
    return sig;
  }

  /**
   * Creates a transaction for depositing tokens into a marginfi bank account.
   *
   * @param amount - The amount of tokens to deposit, can be a number or Amount object
   * @param bankAddress - The public key of the bank to deposit into
   * @param depositOpts - Optional deposit configuration parameters
   * @returns A transaction object ready to be signed and sent
   */
  async makeDepositTx(
    amount: Amount,
    bankAddress: PublicKey,
    depositOpts: MakeDepositIxOpts = {}
  ): Promise<ExtendedTransaction> {
    const ixs = await this.makeDepositIx(amount, bankAddress, depositOpts);
    const tx = new Transaction().add(...ixs.instructions);
    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);
    const solanaTx = addTransactionMetadata(tx, {
      type: TransactionType.DEPOSIT,
      signers: ixs.keys,
      addressLookupTables: clientLookupTables,
    });

    return solanaTx;
  }

  /**
   * Simulates a mrgnlend transaction to preview its effects.
   *
   * @param txs - Array of transactions to simulate, can be either VersionedTransaction or Transaction
   * @param bankAddress - The public key of the bank to inspect
   * @param additionalAccountsToInspect - Optional array of additional account public keys to inspect during simulation
   * @returns A SimulationResult containing the preview state of both the marginfi account and bank
   * @throws Will throw an error if simulation fails
   */
  async simulateBorrowLendTransaction(
    txs: (VersionedTransaction | Transaction)[],
    banksToInspect: PublicKey[],
    healthSimOptions?: {
      enabled: boolean;
      mandatoryBanks: PublicKey[];
      excludedBanks: PublicKey[];
    }
  ): Promise<SimulationResult> {
    const additionalTxs: VersionedTransaction[] = [];

    if (healthSimOptions?.enabled) {
      const computeIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
      const updateFeedIx = await this.makeUpdateFeedIx(healthSimOptions.mandatoryBanks);
      const healthPulseIx = await this.makePulseHealthIx(
        healthSimOptions.mandatoryBanks,
        healthSimOptions.excludedBanks
      );

      const blockhash = (await this.client.provider.connection.getLatestBlockhash("confirmed")).blockhash;

      const tx = new VersionedTransaction(
        new TransactionMessage({
          instructions: [computeIx, ...updateFeedIx.instructions, ...healthPulseIx.instructions],
          payerKey: this.client.provider.publicKey,
          recentBlockhash: blockhash,
        }).compileToV0Message([...this.client.addressLookupTables, ...updateFeedIx.luts])
      );

      additionalTxs.push(tx);
    }

    const [mfiAccountData, ...bankData] = await this.client.simulateTransactions(
      [...txs, ...additionalTxs],
      [this.address, ...banksToInspect]
    );

    if (!mfiAccountData) throw new Error("Failed to simulate");
    const mfiAccount = MarginfiAccount.decode(mfiAccountData, this._program.idl);
    console.log("mfiAccount", mfiAccount);
    if (!bankData) throw new Error("Failed to simulate");
    const previewBanks = this.client.banks;

    banksToInspect.forEach((bankAddress, idx) => {
      const data = bankData[idx];
      if (!data) throw new Error("Failed to simulate");
      previewBanks.set(
        bankAddress.toBase58(),
        Bank.fromBuffer(bankAddress, data, this._program.idl, this.client.feedIdMap)
      );
    });

    const previewClient = new MarginfiClient(
      this._config,
      this.client.program,
      {} as Wallet,
      true,
      this.client.group,
      this.client.banks,
      this.client.oraclePrices,
      this.client.mintDatas,
      this.client.feedIdMap
    );
    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      this.address,
      previewClient,
      mfiAccountData,
      this._program.idl
    );

    return {
      banks: previewBanks,
      marginfiAccount: previewMarginfiAccount,
    };
  }

  /**
   * Creates a transaction instruction for repaying a loan.
   *
   * @param amount - The amount to repay, can be a number or Amount object
   * @param bankAddress - The public key of the bank to repay to
   * @param repayAll - Whether to repay the entire loan balance, defaults to false
   * @param repayOpts - Optional parameters for the repay instruction
   * @returns An InstructionsWrapper containing the deposit instructions
   * @throws Will throw an error if the repay mint is not found
   */
  async makeRepayIx(
    amount: Amount,
    bankAddress: PublicKey,
    repayAll: boolean = false,
    repayOpts: MakeRepayIxOpts = {}
  ): Promise<InstructionsWrapper> {
    const tokenProgramAddress = this.client.mintDatas.get(bankAddress.toBase58())?.tokenProgram;
    if (!tokenProgramAddress) throw Error("Repay mint not found");

    return this._marginfiAccount.makeRepayIx(
      this._program,
      this.client.banks,
      this.client.mintDatas,
      amount,
      bankAddress,
      repayAll,
      repayOpts
    );
  }

  /**
   * Repays a loan in a marginfi bank account.
   *
   * @param amount - The amount to repay, can be a number or Amount object
   * @param bankAddress - The public key of the bank to repay to
   * @param repayAll - Whether to repay the entire loan balance, defaults to false
   * @param repayOpts - Optional parameters for the repay instruction
   * @param processOpts - Optional transaction processing configuration
   * @param txOpts - Optional transaction options
   * @returns The transaction signature of the repayment
   */
  async repay(
    amount: Amount,
    bankAddress: PublicKey,
    repayAll: boolean = false,
    repayOpts: MakeRepayIxOpts = {},
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:repay`);
    debug("Repaying %s into marginfi account (bank: %s), repay all: %s", amount, bankAddress, repayAll);

    const tx = await this.makeRepayTx(amount, bankAddress, repayAll, repayOpts);

    const sig = await this.client.processTransaction(tx, processOpts, txOpts);

    debug("Depositing successful %s", sig);

    return sig;
  }

  /**
   * Creates a transaction for repaying a loan in a marginfi bank account.
   *
   * @param amount - The amount to repay, can be a number or Amount object
   * @param bankAddress - The public key of the bank to repay to
   * @param repayAll - Whether to repay the entire loan balance, defaults to false
   * @param repayOpts - Optional parameters for the repay instruction
   * @returns A transaction object containing the repay instructions
   */
  async makeRepayTx(
    amount: Amount,
    bankAddress: PublicKey,
    repayAll: boolean = false,
    repayOpts: MakeRepayIxOpts = {}
  ): Promise<ExtendedTransaction> {
    const ixs = await this.makeRepayIx(amount, bankAddress, repayAll, repayOpts);
    const tx = new Transaction().add(...ixs.instructions);
    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);
    const solanaTx = addTransactionMetadata(tx, {
      type: TransactionType.REPAY,
      signers: ixs.keys,
      addressLookupTables: clientLookupTables,
    });
    return solanaTx;
  }

  /**
   * Creates instructions for withdrawing tokens from a marginfi bank account.
   *
   * @param amount - The amount of tokens to withdraw, can be a number or Amount object
   * @param bankAddress - The public key of the bank to withdraw from
   * @param withdrawAll - Whether to withdraw the entire balance, defaults to false
   * @param withdrawOpts - Optional parameters for the withdraw instruction
   * @returns An InstructionsWrapper containing the withdraw instructions and signers
   * @throws Will throw an error if the withdraw mint is not found
   */
  async makeWithdrawIx(
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false,
    withdrawOpts: MakeWithdrawIxOpts = {}
  ): Promise<InstructionsWrapper> {
    const tokenProgramAddress = this.client.mintDatas.get(bankAddress.toBase58())?.tokenProgram;
    if (!tokenProgramAddress) throw Error("Withdraw mint not found");

    if (!this.client.bankMetadataMap) throw Error("Bank metadata map not found");

    return this._marginfiAccount.makeWithdrawIx(
      this._program,
      this.client.banks,
      this.client.mintDatas,
      this.client.bankMetadataMap,
      amount,
      bankAddress,
      withdrawAll,
      withdrawOpts
    );
  }

  /**
   * Creates a transaction for withdrawing tokens from a marginfi bank account and staking them.
   * - Withdraw from marginfi bank
   * - Create stake account
   * - Approve mint authority to burn tokens
   * - Delegate stake account
   *
   * @param amount - The amount of tokens to withdraw, can be a number or Amount object
   * @param bankAddress - The public key of the bank to withdraw from
   * @param isWholePosition - Whether to withdraw the entire position, defaults to false
   * @returns A transaction object ready to be signed and sent
   */
  async makeWithdrawStakedTx(
    amount: Amount,
    bankAddress: PublicKey,
    isWholePosition: boolean
  ): Promise<TransactionBuilderResult> {
    // get bank and metadata
    const bank = this.client.getBankByPk(bankAddress);
    const solBank = this.client.getBankByMint(WSOL_MINT);
    const bankMetadata = this.client.bankMetadataMap![bankAddress.toBase58()];

    if (!bank || !solBank) {
      throw new Error("Banks not found");
    }

    if (!bankMetadata.validatorVoteAccount) {
      throw new Error("Validator vote account not found");
    }

    // derive addresses
    const pool = findPoolAddress(new PublicKey(bankMetadata.validatorVoteAccount));
    const lstMint = findPoolMintAddress(pool);
    const mintAuthority = findPoolMintAuthorityAddress(pool);
    const lstAta = getAssociatedTokenAddressSync(lstMint, this.authority);

    // calculate amounts and thresholds
    const rentExemption = await this._program.provider.connection.getMinimumBalanceForRentExemption(200);

    const stakeAmount = new BigNumber(new BigNumber(amount).toString());

    // withdraw from marginfi bank
    const withdrawIxs = await this.makeWithdrawIx(amount, bankAddress, isWholePosition, {
      createAtas: true,
      wrapAndUnwrapSol: true,
    });

    // create stake account
    const stakeAccount = Keypair.generate();
    const createStakeAccountIx = SystemProgram.createAccount({
      fromPubkey: this.authority,
      newAccountPubkey: stakeAccount.publicKey,
      lamports: rentExemption,
      space: 200,
      programId: STAKE_PROGRAM_ID,
    });

    // approve mint authority to burn tokens
    const approveAccountAuthorityIx = Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      lstAta,
      mintAuthority,
      this.authority,
      [],
      stakeAmount.multipliedBy(1e9).toNumber()
    );

    // delegate stake account
    const withdrawStakeIx: TransactionInstruction = await SinglePoolInstruction.withdrawStake(
      pool,
      stakeAccount.publicKey,
      this.authority,
      lstAta,
      stakeAmount
    );

    // build transaction
    const {
      value: { blockhash },
    } = await this._program.provider.connection.getLatestBlockhashAndContext("confirmed");

    const withdrawMessage = new TransactionMessage({
      payerKey: this.client.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: [...withdrawIxs.instructions],
    }).compileToV0Message(this.client.addressLookupTables);
    const withdrawTxn = addTransactionMetadata(new VersionedTransaction(withdrawMessage), {
      signers: withdrawIxs.keys,
      addressLookupTables: this.client.addressLookupTables,
      type: TransactionType.WITHDRAW,
    });

    const stakeMessage = new TransactionMessage({
      payerKey: this.client.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: [createStakeAccountIx, approveAccountAuthorityIx, withdrawStakeIx],
    }).compileToV0Message(this.client.addressLookupTables);
    const stakeTxn = addTransactionMetadata(new VersionedTransaction(stakeMessage), {
      signers: [stakeAccount],
      addressLookupTables: this.client.addressLookupTables,
      type: TransactionType.WITHDRAW_STAKE,
    });

    return { transactions: [withdrawTxn, stakeTxn], actionTxIndex: 1 };
  }

  /**
   * Creates a transaction for withdrawing all tokens from multiple marginfi banks.
   *
   * @param banks - Array of objects containing amount and bank address for each withdrawal
   * @param withdrawOpts - Optional parameters for the withdraw instructions
   * @returns A transaction object ready to be signed and sent
   */
  async makeWithdrawAllTx(
    banks: {
      amount: Amount;
      bankAddress: PublicKey;
    }[],
    withdrawOpts: MakeWithdrawIxOpts = {}
  ): Promise<ExtendedTransaction> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:withdraw`);
    debug("Withdrawing all from marginfi account");
    const cuRequestIxs = this.makeComputeBudgetIx();

    // TODO add crank

    const withdrawIxsPromises = banks.map((bank) =>
      this.makeWithdrawIx(bank.amount, bank.bankAddress, true, withdrawOpts)
    );
    const withdrawIxsWrapped = await Promise.all(withdrawIxsPromises);

    const withdrawIxs = withdrawIxsWrapped.map((ix) => ix.instructions).flat();
    // make sure all signers are unique
    const filteredSigners = withdrawIxsWrapped
      .map((ix) => ix.keys)
      .flat()
      .filter((key, index, self) => index === self.findIndex((k) => k.publicKey.equals(key.publicKey)));

    const tx = new Transaction().add(...cuRequestIxs, ...withdrawIxs);
    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);

    const solanaTx = addTransactionMetadata(tx, {
      signers: filteredSigners,
      addressLookupTables: clientLookupTables,
      type: TransactionType.WITHDRAW_ALL,
    });
    return solanaTx;
  }

  /**
   * Withdraws tokens from a marginfi bank account.
   *
   * @param amount - The amount of tokens to withdraw, can be a number or Amount object
   * @param bankAddress - The public key of the bank to withdraw from
   * @param withdrawAll - If true, withdraws entire balance from the bank
   * @param withdrawOpts - Optional withdraw configuration parameters
   * @param processOpts - Optional transaction processing configuration
   * @param txOpts - Optional transaction options
   * @returns Array of transaction signatures - includes signatures for any required oracle feed updates followed by the withdraw transaction
   */
  async withdraw(
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false,
    withdrawOpts: MakeWithdrawIxOpts = {},
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature[]> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:withdraw`);
    debug("Withdrawing %s from marginfi account", amount);

    const { transactions } = await this.makeWithdrawTx(amount, bankAddress, withdrawAll, withdrawOpts);

    // process multiple transactions if feed updates required
    const sigs = await this.client.processTransactions([...transactions], processOpts, txOpts);

    debug("Withdrawing successful %s", sigs[sigs.length - 1]);
    return sigs;
  }

  /**
   * Creates a versioned transaction for withdrawing tokens from a marginfi bank account.
   *
   * @param amount - The amount of tokens to withdraw, can be a number or Amount object
   * @param bankAddress - The public key of the bank to withdraw from
   * @param withdrawAll - If true, withdraws entire balance from the bank
   * @param withdrawOpts - Optional withdraw configuration parameters
   * @returns Object containing feed crank transactions and the withdraw transaction
   */
  async makeWithdrawTx(
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false,
    withdrawOpts: MakeWithdrawIxOpts = {}
  ): Promise<TransactionBuilderResult> {
    const cuRequestIxs = this.makeComputeBudgetIx();
    const { instructions: updateFeedIxs, luts: feedLuts } = await this.makeUpdateFeedIx([]);
    const withdrawIxs = await this.makeWithdrawIx(amount, bankAddress, withdrawAll, withdrawOpts);

    const {
      value: { blockhash },
    } = await this._program.provider.connection.getLatestBlockhashAndContext("confirmed");

    let feedCrankTxs: ExtendedV0Transaction[] = [];

    if (updateFeedIxs.length > 0) {
      feedCrankTxs.push(
        addTransactionMetadata(
          new VersionedTransaction(
            new TransactionMessage({
              instructions: [...updateFeedIxs],
              payerKey: this.authority,
              recentBlockhash: blockhash,
            }).compileToV0Message(feedLuts)
          ),
          {
            addressLookupTables: feedLuts,
            type: TransactionType.CRANK,
          }
        )
      );
    }

    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);

    const withdrawTx = addTransactionMetadata(
      new VersionedTransaction(
        new TransactionMessage({
          instructions: [...cuRequestIxs, ...withdrawIxs.instructions],
          payerKey: this.authority,
          recentBlockhash: blockhash,
        }).compileToV0Message(clientLookupTables)
      ),
      {
        signers: withdrawIxs.keys,
        addressLookupTables: clientLookupTables,
        type: TransactionType.WITHDRAW,
      }
    );

    const transactions = [...feedCrankTxs, withdrawTx];

    return { transactions, actionTxIndex: transactions.length - 1 };
  }

  /**
   * Creates instructions for borrowing tokens from a marginfi bank account.
   *
   * @param amount - The amount of tokens to borrow, can be a number or Amount object
   * @param bankAddress - The public key of the bank to borrow from
   * @param borrowOpts - Optional borrow configuration parameters
   * @returns An InstructionsWrapper containing the borrow instructions
   */
  async makeBorrowIx(
    amount: Amount,
    bankAddress: PublicKey,
    borrowOpts: MakeBorrowIxOpts = {}
  ): Promise<InstructionsWrapper> {
    const tokenProgramAddress = this.client.mintDatas.get(bankAddress.toBase58())?.tokenProgram;
    if (!tokenProgramAddress) throw Error("Borrow mint not found");

    if (!this.client.bankMetadataMap) throw Error("Bank metadata map not found");

    return this._marginfiAccount.makeBorrowIx(
      this._program,
      this.client.banks,
      this.client.mintDatas,
      this.client.bankMetadataMap,
      amount,
      bankAddress,
      borrowOpts
    );
  }

  /**
   * Borrows tokens from a marginfi bank account.
   *
   * @param amount - The amount of tokens to borrow, can be a number or Amount object
   * @param bankAddress - The public key of the bank to borrow from
   * @param borrowOpts - Optional borrow configuration parameters
   * @param processOpts - Optional transaction processing configuration
   * @param txOpts - Optional transaction configuration parameters
   * @returns Array of transaction signatures from the borrow operation
   */
  async borrow(
    amount: Amount,
    bankAddress: PublicKey,
    borrowOpts: MakeBorrowIxOpts = {},
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature[]> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:borrow`);
    debug("Borrowing %s from marginfi account", amount);

    const { transactions } = await this.makeBorrowTx(amount, bankAddress, borrowOpts);

    const sigs = await this.client.processTransactions([...transactions], processOpts, txOpts);
    debug("Borrowing successful %s", sigs);
    return sigs;
  }

  /**
   * Creates a versioned transaction for borrowing tokens from a marginfi bank account.
   *
   * @param amount - The amount of tokens to borrow, can be a number or Amount object
   * @param bankAddress - The public key of the bank to borrow from
   * @param borrowOpts - Optional borrow configuration parameters
   * @returns Object containing feed crank transactions and the borrow transaction
   */
  async makeBorrowTx(
    amount: Amount,
    bankAddress: PublicKey,
    borrowOpts: MakeBorrowIxOpts = {}
  ): Promise<TransactionBuilderResult> {
    const cuRequestIxs = this.makeComputeBudgetIx();

    // if banks are stale and using switchboard pull, we need to crank the feed
    const { instructions: updateFeedIxs, luts: feedLuts } = await this.makeUpdateFeedIx([bankAddress]);
    const borrowIxs = await this.makeBorrowIx(amount, bankAddress, borrowOpts);

    const {
      value: { blockhash },
    } = await this._program.provider.connection.getLatestBlockhashAndContext("confirmed");

    let feedCrankTxs: ExtendedV0Transaction[] = [];

    if (updateFeedIxs.length > 0) {
      feedCrankTxs.push(
        addTransactionMetadata(
          new VersionedTransaction(
            new TransactionMessage({
              instructions: updateFeedIxs,
              payerKey: this.authority,
              recentBlockhash: blockhash,
            }).compileToV0Message(feedLuts)
          ),
          {
            type: TransactionType.CRANK,
            addressLookupTables: feedLuts,
          }
        )
      );
    }

    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);

    const borrowTx = addTransactionMetadata(
      new VersionedTransaction(
        new TransactionMessage({
          instructions: [...cuRequestIxs, ...borrowIxs.instructions],
          payerKey: this.authority,
          recentBlockhash: blockhash,
        }).compileToV0Message(clientLookupTables)
      ),
      {
        signers: borrowIxs.keys,
        type: TransactionType.BORROW,
        addressLookupTables: clientLookupTables,
      }
    );

    const transactions = [...feedCrankTxs, borrowTx];
    return { transactions, actionTxIndex: transactions.length - 1 };
  }

  /**
   * Creates instructions for withdrawing emissions rewards from a marginfi bank account.
   *
   * @param bankAddress - The public key of the bank to withdraw emissions from
   * @returns An InstructionsWrapper containing the withdraw emissions instructions
   */
  async makeWithdrawEmissionsIx(bankAddress: PublicKey): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeWithdrawEmissionsIx(
      this._program,
      this.client.banks,
      this.client.mintDatas,
      bankAddress
    );
  }

  /**
   * Creates a versioned transaction for withdrawing emissions rewards from multiple marginfi bank accounts.
   *
   * @param bankAddresses - Array of public keys for the banks to withdraw emissions from
   * @returns A versioned transaction containing the withdraw emissions instructions
   */
  async makeWithdrawEmissionsTx(bankAddresses: PublicKey[]): Promise<ExtendedV0Transaction> {
    const {
      value: { blockhash },
    } = await this._program.provider.connection.getLatestBlockhashAndContext("confirmed");

    const withdrawEmissionsIxs: InstructionsWrapper[] = [];
    await Promise.all(
      bankAddresses.map(async (bankAddress) => {
        const ix = await this.makeWithdrawEmissionsIx(bankAddress);
        if (!ix) return;
        withdrawEmissionsIxs.push(ix);
      })
    );

    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);

    const emissionsTx = addTransactionMetadata(
      new VersionedTransaction(
        new TransactionMessage({
          instructions: withdrawEmissionsIxs.map((ix) => ix.instructions).flat(),
          payerKey: this.authority,
          recentBlockhash: blockhash,
        }).compileToV0Message(clientLookupTables)
      ),
      {
        signers: withdrawEmissionsIxs.map((ix) => ix.keys).flat(),
        type: TransactionType.WITHDRAW_EMISSIONS,
        addressLookupTables: clientLookupTables,
      }
    );

    return emissionsTx;
  }

  /**
   * Withdraws emissions rewards from multiple marginfi bank accounts.
   *
   * @param bankAddresses - Array of public keys for the banks to withdraw emissions from
   * @param processOpts - Optional processing options for the transaction
   * @param txOpts - Optional transaction options
   * @returns The transaction signature of the withdraw emissions transaction
   */
  async withdrawEmissions(
    bankAddresses: PublicKey[],
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:withdraw-emissions`);
    debug("Withdrawing emission from marginfi account (bank: %s)", bankAddresses.map((b) => b.toBase58()).join(", "));

    const withdrawEmissionsTx = await this.makeWithdrawEmissionsTx(bankAddresses);
    const sig = await this.client.processTransaction(withdrawEmissionsTx, processOpts, txOpts);
    debug("Withdrawing emission successful %s", sig);
    return sig;
  }

  /**
   * Creates an instruction wrapper for liquidating a lending account position.
   *
   * @param liquidateeMarginfiAccount - The marginfi account to be liquidated
   * @param assetBankAddress - Public key of the bank containing the asset to receive in liquidation
   * @param assetQuantityUi - Amount of the asset to receive, in UI units
   * @param liabBankAddress - Public key of the bank containing the liability to repay
   * @returns An instruction wrapper containing the liquidation instructions
   */
  public async makeLendingAccountLiquidateIx(
    liquidateeMarginfiAccount: MarginfiAccount,
    assetBankAddress: PublicKey,
    assetQuantityUi: Amount,
    liabBankAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const liabTokenProgramAddress = this.client.mintDatas.get(liabBankAddress.toBase58())?.tokenProgram;
    if (!liabTokenProgramAddress) throw Error("Liability mint not found");

    if (!this.client.bankMetadataMap) throw Error("Bank metadata map not found");

    return this._marginfiAccount.makeLendingAccountLiquidateIx(
      liquidateeMarginfiAccount,
      this._program,
      this.client.banks,
      this.client.mintDatas,
      this.client.bankMetadataMap,
      assetBankAddress,
      assetQuantityUi,
      liabBankAddress
    );
  }

  /**
   * Liquidates a lending account position.
   *
   * @param liquidateeMarginfiAccount - The marginfi account to be liquidated
   * @param assetBankAddress - Public key of the bank containing the asset to receive in liquidation
   * @param assetQuantityUi - Amount of the asset to receive, in UI units
   * @param liabBankAddress - Public key of the bank containing the liability to repay
   * @param processOpts - Optional processing options for the transaction
   * @param txOpts - Optional transaction options
   * @returns The transaction signature of the liquidation transaction
   */
  public async lendingAccountLiquidate(
    liquidateeMarginfiAccount: MarginfiAccount,
    assetBankAddress: PublicKey,
    assetQuantityUi: Amount,
    liabBankAddress: PublicKey,
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:liquidation`);
    debug("Liquidating marginfi account %s", liquidateeMarginfiAccount.address.toBase58());
    const liquidationIxs = await this.makeLendingAccountLiquidateIx(
      liquidateeMarginfiAccount,
      assetBankAddress,
      assetQuantityUi,
      liabBankAddress
    );
    const tx = new Transaction().add(...liquidationIxs.instructions);
    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);
    const solanaTx = addTransactionMetadata(tx, {
      signers: liquidationIxs.keys,
      addressLookupTables: clientLookupTables,
      type: TransactionType.LIQUIDATE_ACCOUNT,
    });
    const sig = await this.client.processTransaction(solanaTx, processOpts, txOpts);
    debug("Liquidation successful %s", sig);
    return sig;
  }

  /**
   * Creates an instruction to begin a flash loan operation.
   *
   * @param endIndex - The index where the flash loan instructions end in the transaction
   * @returns An InstructionsWrapper containing the begin flash loan instruction
   */
  public async makeBeginFlashLoanIx(endIndex: number): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeBeginFlashLoanIx(this._program, endIndex);
  }

  /**
   * Creates an instruction to end a flash loan operation.
   *
   * @param projectedActiveBalances - Array of PublicKeys representing the projected active balance accounts after flash loan
   * @returns An InstructionsWrapper containing the end flash loan instruction
   */
  public async makeEndFlashLoanIx(projectedActiveBalances: PublicKey[]): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeEndFlashLoanIx(this._program, this.client.banks, projectedActiveBalances);
  }

  public async flashLoan(
    args: FlashLoanArgs,
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<TransactionSignature> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:flashLoan`);
    debug("Executing flashloan from marginfi account");
    const clientLookupTables = await getClientAddressLookupTableAccounts(this.client);
    const tx = await this.buildFlashLoanTx(args, clientLookupTables);
    const sig = await this.client.processTransaction(tx, processOpts, txOpts);
    debug("Flashloan successful %s", sig);
    return sig;
  }

  public async buildFlashLoanTx(
    args: FlashLoanArgs,
    lookupTables?: AddressLookupTableAccount[]
  ): Promise<ExtendedV0Transaction> {
    const endIndex = args.ixs.length + 1;

    const projectedActiveBalances: PublicKey[] = this._marginfiAccount.projectActiveBalancesNoCpi(
      this._program,
      args.ixs
    );

    const beginFlashLoanIx = await this.makeBeginFlashLoanIx(endIndex);
    const endFlashLoanIx = await this.makeEndFlashLoanIx(projectedActiveBalances);

    const flashloanIxs = [...beginFlashLoanIx.instructions, ...args.ixs, ...endFlashLoanIx.instructions];
    const totalLookupTables = [...(lookupTables ?? []), ...(args.addressLookupTableAccounts ?? [])];

    const blockhash =
      args.blockhash ?? (await this._program.provider.connection.getLatestBlockhash("confirmed")).blockhash;
    const message = new TransactionMessage({
      payerKey: this.client.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: flashloanIxs,
    }).compileToV0Message(totalLookupTables);

    const tx = addTransactionMetadata(new VersionedTransaction(message), {
      addressLookupTables: totalLookupTables,
      type: TransactionType.FLASHLOAN,
    });

    if (args.signers) {
      tx.sign(args.signers);
    }

    return tx;
  }

  public async makeTransferAccountAuthorityIx(newAccountAuthority: PublicKey): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeAccountAuthorityTransferIx(this._program, newAccountAuthority);
  }

  async transferAccountAuthority(
    newAccountAuthority: PublicKey,
    processOpts?: ProcessTransactionsClientOpts,
    txOpts?: TransactionOptions
  ): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:transfer-authority`);
    debug("Transferring account %s to %s", this.address.toBase58(), newAccountAuthority.toBase58());
    const ixs = await this.makeTransferAccountAuthorityIx(newAccountAuthority);
    const tx = new Transaction().add(...ixs.instructions);
    const solanaTx = addTransactionMetadata(tx, { type: TransactionType.TRANSFER_AUTH });
    const sig = await this.client.processTransaction(solanaTx, processOpts, txOpts);
    debug("Transfer successful %s", sig);
    return sig;
  }

  async makeUpdateFeedIx(
    newBanksPk: PublicKey[],
    txLandingBuffer: number = 0
  ): Promise<{
    instructions: TransactionInstruction[];
    luts: AddressLookupTableAccount[];
  }> {
    // filter active and newly opening balances
    const activeBanksPk = this._marginfiAccount.balances
      .filter((balance) => balance.active)
      .map((balance) => balance.bankPk);
    const activeBanks = activeBanksPk.map((pk) => this.client.banks.get(pk.toBase58())!);
    const newBanks = newBanksPk.map((pk) => this.client.banks.get(pk.toBase58())!);

    const swbPullBanks = [...new Set([...activeBanks, ...newBanks]).values()].filter(
      (bank) => bank.config.oracleSetup === OracleSetup.SwitchboardPull
    );

    console.log("swbPullBanks", swbPullBanks);

    if (swbPullBanks.length > 0) {
      const staleOracles = swbPullBanks
        .filter((bank) => {
          // always crank swb feeds
          return true;
          // const oraclePrice = this.client.oraclePrices.get(bank.address.toBase58());
          // const maxAge = bank.config.oracleMaxAge;
          // const currentTime = Math.round(Date.now() / 1000);
          // const oracleTime = Math.round(
          //   oraclePrice?.timestamp ? oraclePrice.timestamp.toNumber() : new Date().getTime()
          // );
          // const adjustedMaxAge = Math.max(maxAge - txLandingBuffer, 0);
          // const isStale = currentTime - oracleTime > adjustedMaxAge;

          // return isStale;
        })
        .map((bank) => bank.oracleKey);

      if (staleOracles.length > 0) {
        const sbProgram = getSwitchboardProgram(this._program.provider);
        const [pullIx, luts] = await sb.PullFeed.fetchUpdateManyIx(sbProgram, {
          feeds: staleOracles,
          numSignatures: 1,
        });
        return { instructions: [pullIx], luts };
      }

      return { instructions: [], luts: [] };
    } else {
      return { instructions: [], luts: [] };
    }
  }

  async makePulseHealthIx(mandatoryBanks: PublicKey[] = [], excludedBanks: PublicKey[] = []) {
    return this._marginfiAccount.makePulseHealthIx(
      this._program,
      this.client.banks,
      mandatoryBanks,
      excludedBanks,
      this.client.bankMetadataMap || {}
    );
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private static async _fetchAccountData(
    accountAddress: Address,
    config: MarginfiConfig,
    program: MarginfiProgram,
    commitment?: Commitment
  ): Promise<MarginfiAccountRaw> {
    const mergedCommitment = commitment ?? program.provider.connection.commitment ?? DEFAULT_COMMITMENT;

    const data: MarginfiAccountRaw = (await program.account.marginfiAccount.fetch(
      accountAddress,
      mergedCommitment
    )) as any;

    if (!data.group.equals(config.groupPk))
      throw Error(`Marginfi account tied to group ${data.group.toBase58()}. Expected: ${config.groupPk.toBase58()}`);

    return data;
  }

  static async encode(decoded: MarginfiAccountRaw, idl: MarginfiIdlType): Promise<Buffer> {
    const coder = new BorshCoder(idl);
    return await coder.accounts.encode(AccountType.MarginfiAccount, decoded);
  }

  async reload() {
    require("debug")(`mfi:margin-account:${this.address.toBase58().toString()}:loader`)("Reloading account data");
    const marginfiAccountAi = await this._program.account.marginfiAccount.getAccountInfo(this.address);
    if (!marginfiAccountAi) throw new Error(`Failed to fetch data for marginfi account ${this.address.toBase58()}`);
    const marginfiAccountParsed = MarginfiAccount.decode(marginfiAccountAi.data, this._program.idl);
    if (!marginfiAccountParsed.group.equals(this._config.groupPk))
      throw Error(
        `Marginfi account tied to group ${marginfiAccountParsed.group.toBase58()}. Expected: ${this._config.groupPk.toBase58()}`
      );

    this._updateFromAccountParsed(marginfiAccountParsed);
  }

  private _updateFromAccountParsed(data: MarginfiAccountRaw) {
    this._marginfiAccount = MarginfiAccount.fromAccountParsed(this.address, data);
  }

  public describe(): string {
    return this._marginfiAccount.describe(this.client.banks, this.client.oraclePrices);
  }

  // --------------------------------------------------------------------------
  // DEPRECATED METHODS
  // --------------------------------------------------------------------------

  /**
   * @deprecated This method is deprecated. Please use simulateBorrowLendTransaction instead.
   */
  async simulateDeposit(amount: Amount, bankAddress: PublicKey): Promise<SimulationResult> {
    const ixs = await this.makeDepositIx(amount, bankAddress);
    const tx = new Transaction().add(...ixs.instructions);
    try {
      return this.simulateBorrowLendTransaction([tx], [bankAddress]);
    } catch (e) {
      throw new Error("Failed to simulate deposit");
    }
  }

  /**
   * @deprecated This method is deprecated. Please use simulateBorrowLendTransaction instead.
   */
  async simulateWithdraw(bankAddress: PublicKey, txs: VersionedTransaction[]): Promise<SimulationResult> {
    try {
      return this.simulateBorrowLendTransaction(txs, [bankAddress]);
    } catch (e) {
      throw new Error("Failed to simulate withdraw");
    }
  }

  /**
   * @deprecated This method is deprecated. Please use simulateBorrowLendTransaction instead.
   */
  async simulateBorrow(bankAddress: PublicKey, txs: VersionedTransaction[]): Promise<SimulationResult> {
    try {
      return this.simulateBorrowLendTransaction(txs, [bankAddress]);
    } catch (e) {
      throw new Error("Failed to simulate borrow");
    }
  }

  /**
   * @deprecated This method is deprecated. Please use simulateBorrowLendTransaction instead.
   */
  async simulateRepay(amount: Amount, bankAddress: PublicKey, repayAll: boolean = false): Promise<SimulationResult> {
    const ixs = await this.makeRepayIx(amount, bankAddress, repayAll);
    const tx = new Transaction().add(...ixs.instructions);
    try {
      return this.simulateBorrowLendTransaction([tx], [bankAddress]);
    } catch (e) {
      throw new Error("Failed to simulate repay");
    }
  }
}

/**
 * @deprecated This method is deprecated.
 */
export function makeTxPriorityIx(
  feePayer: PublicKey,
  feeUi: number = 0,
  broadcastType: TransactionBroadcastType = "BUNDLE",
  computeUnitsLimit?: number
) {
  let bundleTipIx: TransactionInstruction | undefined = undefined;
  let priorityFeeIx: TransactionInstruction = makePriorityFeeIx()[0];

  if (broadcastType === "BUNDLE") {
    bundleTipIx = makeBundleTipIx(feePayer, Math.trunc(feeUi * LAMPORTS_PER_SOL));
  } else {
    priorityFeeIx = makePriorityFeeIx(feeUi, computeUnitsLimit)[0];
  }

  return {
    bundleTipIx,
    priorityFeeIx,
  };
}

export function makeBundleTipIx(feePayer: PublicKey, bundleTip: number = 100_000): TransactionInstruction {
  // they have remained constant so function not used (for now)
  const getTipAccounts = async () => {
    const response = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTipAccounts",
        params: [],
      }),
    });

    const data = await response.json();
    return data.result;
  };

  const tipAccounts = [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
  ];
  const randomTipAccount = tipAccounts[Math.floor(Math.random() * tipAccounts.length)];

  return SystemProgram.transfer({
    fromPubkey: feePayer,
    toPubkey: new PublicKey(randomTipAccount),
    lamports: bundleTip, // 100_000 lamports = 0.0001 SOL
  });
}

async function getClientAddressLookupTableAccounts(client: MarginfiClient) {
  const addresses = client.lookupTablesAddresses;
  const luts: AddressLookupTableAccount[] = client.addressLookupTables;

  for (const address of addresses) {
    const lut = await client.provider.connection.getAddressLookupTable(address);
    if (lut.value) {
      luts.push(lut.value);
    }
  }

  return luts;
}

export { MarginfiAccountWrapper };
