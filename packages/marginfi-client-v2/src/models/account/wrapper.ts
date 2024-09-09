import {
  Amount,
  DEFAULT_COMMITMENT,
  InstructionsWrapper,
  TOKEN_2022_PROGRAM_ID,
  Wallet,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  shortenAddress,
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
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import {
  MakeBorrowIxOpts,
  MakeDepositIxOpts,
  MakeRepayIxOpts,
  MakeWithdrawIxOpts,
  MarginfiClient,
  MarginfiGroup,
  MarginfiIdlType,
  OracleSetup,
} from "../..";
import { AccountType, MarginfiConfig, MarginfiProgram } from "../../types";
import { MarginfiAccount, MarginRequirementType, MarginfiAccountRaw } from "./pure";
import { Bank, computeLoopingParams } from "../bank";
import { Balance } from "../balance";
import { getSwitchboardProgram } from "../../vendor";

export interface SimulationResult {
  banks: Map<string, Bank>;
  marginfiAccount: MarginfiAccountWrapper;
}

export interface FlashLoanArgs {
  ixs: TransactionInstruction[];
  signers?: Signer[];
  addressLookupTableAccounts?: AddressLookupTableAccount[];
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
  private constructor(
    marginfiAccountPk: PublicKey,
    private readonly client: MarginfiClient,
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
    const marginfiAccount = new MarginfiAccount(_marginfiAccountPk, accountData);

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
    const marginfiAccount = new MarginfiAccount(_marginfiAccountPk, accountData);
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

  public canBeLiquidated(): boolean {
    const debugLogger = require("debug")(`mfi:margin-account:${this.address.toString()}:canBeLiquidated`);
    const { assets, liabilities } = this._marginfiAccount.computeHealthComponents(
      this.client.banks,
      this.client.oraclePrices,
      MarginRequirementType.Maintenance
    );

    debugLogger(
      "Account %s, maint assets: %s, maint liabilities: %s, maint healt: %s",
      this.address,
      assets,
      liabilities
    );

    return assets.lt(liabilities);
  }

  public computeHealthComponents(
    marginRequirement: MarginRequirementType,
    excludedBanks: PublicKey[] = []
  ): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return this._marginfiAccount.computeHealthComponents(
      this.client.banks,
      this.client.oraclePrices,
      marginRequirement,
      excludedBanks
    );
  }

  public computeFreeCollateral(opts?: { clamped?: boolean }): BigNumber {
    return this._marginfiAccount.computeFreeCollateral(this.client.banks, this.client.oraclePrices, opts);
  }

  public computeHealthComponentsWithoutBias(marginRequirement: MarginRequirementType): {
    assets: BigNumber;
    liabilities: BigNumber;
  } {
    return this._marginfiAccount.computeHealthComponentsWithoutBias(
      this.client.banks,
      this.client.oraclePrices,
      marginRequirement
    );
  }

  public computeAccountValue(): BigNumber {
    return this._marginfiAccount.computeAccountValue(this.client.banks, this.client.oraclePrices);
  }

  public computeMaxBorrowForBank(bankAddress: PublicKey, opts?: { volatilityFactor?: number }): BigNumber {
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

  makePriorityFeeIx(priorityFeeUi?: number): TransactionInstruction[] {
    const priorityFeeIx: TransactionInstruction[] = [];
    const limitCU = 1_400_000;

    let microLamports: number = 1;

    if (priorityFeeUi) {
      // if priority fee is above 0.2 SOL discard it for safety reasons
      const isAbsurdPriorityFee = priorityFeeUi > 0.2;

      if (!isAbsurdPriorityFee) {
        const priorityFeeMicroLamports = priorityFeeUi * LAMPORTS_PER_SOL * 1_000_000;
        microLamports = Math.round(priorityFeeMicroLamports / limitCU);
      }
    }

    priorityFeeIx.push(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports,
      })
    );

    return priorityFeeIx;
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

  async repayWithCollat(
    repayAmount: Amount,
    withdrawAmount: Amount,
    borrowBankAddress: PublicKey,
    depositBankAddress: PublicKey,
    withdrawAll: boolean = false,
    repayAll: boolean = false,
    swapIxs: TransactionInstruction[],
    swapLookupTables: AddressLookupTableAccount[],
    priorityFeeUi?: number
  ): Promise<string[]> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:repay`);
    debug("Repaying %s into marginfi account (bank: %s), repay all: %s", repayAmount, borrowBankAddress, repayAll);

    const { flashloanTx, feedCrankTxs } = await this.makeRepayWithCollatTx(
      repayAmount,
      withdrawAmount,
      borrowBankAddress,
      depositBankAddress,
      withdrawAll,
      repayAll,
      swapIxs,
      swapLookupTables,
      priorityFeeUi
    );

    // assumes only one tx
    const sigs = await this.client.processTransactions([flashloanTx, ...feedCrankTxs]);
    debug("Repay with collateral successful %s", sigs.pop() ?? "");

    return sigs;
  }

  async simulateRepayWithCollat(
    repayAmount: Amount,
    withdrawAmount: Amount,
    borrowBankAddress: PublicKey,
    depositBankAddress: PublicKey,
    withdrawAll: boolean = false,
    repayAll: boolean = false,
    swapIxs: TransactionInstruction[],
    addressLookupTableAccounts: AddressLookupTableAccount[]
  ): Promise<SimulationResult> {
    const { flashloanTx } = await this.makeRepayWithCollatTx(
      repayAmount,
      withdrawAmount,
      borrowBankAddress,
      depositBankAddress,
      withdrawAll,
      repayAll,
      swapIxs,
      addressLookupTableAccounts
    );

    const [mfiAccountData, bankData] = await this.client.simulateTransactions(
      [flashloanTx],
      [this.address, borrowBankAddress]
    );
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate repay w/ collat");
    const previewBanks = this.client.banks;
    previewBanks.set(
      borrowBankAddress.toBase58(),
      Bank.fromBuffer(borrowBankAddress, bankData, this._program.idl, this.client.feedIdMap)
    );
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

  async makeRepayWithCollatTx(
    repayAmount: Amount,
    withdrawAmount: Amount,
    borrowBankAddress: PublicKey,
    depositBankAddress: PublicKey,
    withdrawAll: boolean = false,
    repayAll: boolean = false,
    swapIxs: TransactionInstruction[],
    swapLookupTables: AddressLookupTableAccount[],
    priorityFeeUi?: number,
    isTxnSplitParam?: boolean
  ): Promise<{
    flashloanTx: VersionedTransaction;
    feedCrankTxs: VersionedTransaction[];
    addressLookupTableAccounts: AddressLookupTableAccount[];
  }> {
    const setupIxs = await this.makeSetupIx([borrowBankAddress, depositBankAddress]);
    const cuRequestIxs = this.makeComputeBudgetIx();
    const priorityFeeIx = this.makePriorityFeeIx(priorityFeeUi);
    const withdrawIxs = await this.makeWithdrawIx(withdrawAmount, depositBankAddress, withdrawAll, {
      createAtas: false,
      wrapAndUnwrapSol: false,
    });
    const depositIxs = await this.makeRepayIx(repayAmount, borrowBankAddress, repayAll, {
      createAtas: false,
      wrapAndUnwrapSol: false,
    });
    const bundleTipIx = makeBundleTipIx(this.client.provider.publicKey);
    const lookupTables = this.client.addressLookupTables;

    const { instructions: updateFeedIxs, luts: feedLuts } = await this.makeUpdateFeedIx([
      depositBankAddress,
      borrowBankAddress,
    ]);

    const addressLookupTableAccounts = [...lookupTables, ...swapLookupTables];

    let feedCrankTxs: VersionedTransaction[] = [];

    // isTxnSplit forced set to true as we're always splitting now
    const isTxnSplit = true; //isTxnSplitParam
    if (isTxnSplit) {
      const { blockhash } = await this._program.provider.connection.getLatestBlockhash();
      const message = new TransactionMessage({
        payerKey: this.client.wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: [bundleTipIx, ...updateFeedIxs],
      }).compileToV0Message([...addressLookupTableAccounts, ...feedLuts]);

      feedCrankTxs = [new VersionedTransaction(message)];
    }

    const flashloanTx = await this.buildFlashLoanTx({
      ixs: [
        ...priorityFeeIx,
        ...cuRequestIxs,
        ...(isTxnSplit ? [] : [bundleTipIx]),
        ...setupIxs,
        ...withdrawIxs.instructions,
        ...swapIxs,
        ...depositIxs.instructions,
      ],
      addressLookupTableAccounts,
    });

    return { flashloanTx, feedCrankTxs, addressLookupTableAccounts };
  }

  async loop(
    depositAmount: Amount,
    borrowAmount: Amount,
    depositBankAddress: PublicKey,
    borrowBankAddress: PublicKey,
    swapIxs: TransactionInstruction[],
    swapLookupTables: AddressLookupTableAccount[],
    priorityFeeUi?: number
  ): Promise<string | { flashloanTx: VersionedTransaction; addressLookupTableAccounts: AddressLookupTableAccount[] }> {
    const depositBank = this.client.banks.get(depositBankAddress.toBase58());
    if (!depositBank) throw Error("Deposit bank not found");
    const borrowBank = this.client.banks.get(borrowBankAddress.toBase58());
    if (!borrowBank) throw Error("Borrow bank not found");

    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:repay`);
    debug(
      `Looping ${depositAmount} ${depositBank.tokenSymbol} against ${borrowAmount} ${
        borrowBank.tokenSymbol
      } into marginfi account (banks: ${depositBankAddress.toBase58()} / ${borrowBankAddress.toBase58()})`
    );

    const { flashloanTx, feedCrankTxs } = await this.makeLoopTx(
      depositAmount,
      borrowAmount,
      depositBankAddress,
      borrowBankAddress,
      swapIxs,
      swapLookupTables,
      priorityFeeUi
    );

    // TODO: Check why different than repayWithCollat
    const sig = await this.client.processTransaction(flashloanTx, []);
    debug("Repay with collateral successful %s", sig);

    return sig;
  }

  async simulateLoop(
    depositAmount: Amount,
    borrowAmount: Amount,
    depositBankAddress: PublicKey,
    borrowBankAddress: PublicKey,
    swapIxs: TransactionInstruction[],
    swapLookupTables: AddressLookupTableAccount[],
    priorityFeeUi?: number
  ): Promise<SimulationResult> {
    const { flashloanTx } = await this.makeLoopTx(
      depositAmount,
      borrowAmount,
      depositBankAddress,
      borrowBankAddress,
      swapIxs,
      swapLookupTables,
      priorityFeeUi
    );

    const [mfiAccountData, depositBankData, borrowBankData] = await this.client.simulateTransactions(
      [flashloanTx],
      [this.address, depositBankAddress, borrowBankAddress]
    );
    if (!mfiAccountData || !depositBankData || !borrowBankData) throw new Error("Failed to simulate repay w/ collat");
    const previewBanks = this.client.banks;
    previewBanks.set(
      depositBankAddress.toBase58(),
      Bank.fromBuffer(depositBankAddress, depositBankData, this._program.idl, this.client.feedIdMap)
    );
    previewBanks.set(
      borrowBankAddress.toBase58(),
      Bank.fromBuffer(borrowBankAddress, borrowBankData, this._program.idl, this.client.feedIdMap)
    );

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

  async makeLoopTx(
    depositAmount: Amount,
    borrowAmount: Amount,
    depositBankAddress: PublicKey,
    borrowBankAddress: PublicKey,
    swapIxs: TransactionInstruction[],
    swapLookupTables: AddressLookupTableAccount[],
    priorityFeeUi?: number,
    createAtas?: boolean
    // isTxnSplitParam?: boolean
  ): Promise<{
    flashloanTx: VersionedTransaction;
    feedCrankTxs: VersionedTransaction[];
    addressLookupTableAccounts: AddressLookupTableAccount[];
  }> {
    const depositBank = this.client.banks.get(depositBankAddress.toBase58());
    if (!depositBank) throw Error("Deposit bank not found");
    const borrowBank = this.client.banks.get(borrowBankAddress.toBase58());
    if (!borrowBank) throw Error("Borrow bank not found");

    const setupIxs = createAtas ? await this.makeSetupIx([depositBankAddress, borrowBankAddress]) : [];
    const cuRequestIxs = this.makeComputeBudgetIx();
    const priorityFeeIx = this.makePriorityFeeIx(priorityFeeUi);
    const borrowIxs = await this.makeBorrowIx(borrowAmount, borrowBankAddress, {
      createAtas: true,
      wrapAndUnwrapSol: false,
    });
    const depositIxs = await this.makeDepositIx(depositAmount, depositBankAddress, {
      wrapAndUnwrapSol: true,
    });
    const bundleTipIx = makeBundleTipIx(this.client.provider.publicKey);
    const clientLookupTables = this.client.addressLookupTables;

    const { instructions: updateFeedIxs, luts: feedLuts } = await this.makeUpdateFeedIx([
      depositBankAddress,
      borrowBankAddress,
    ]);

    // isTxnSplit forced set to true as we're always splitting now
    const { blockhash } = await this._program.provider.connection.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: this.client.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: [bundleTipIx, ...updateFeedIxs, ...setupIxs],
    }).compileToV0Message([...clientLookupTables, ...feedLuts]);

    const feedCrankTxs = [new VersionedTransaction(message)];

    const flashloanTx = await this.buildFlashLoanTx({
      ixs: [...priorityFeeIx, ...cuRequestIxs, ...borrowIxs.instructions, ...swapIxs, ...depositIxs.instructions],
      addressLookupTableAccounts: [...clientLookupTables, ...swapLookupTables],
    });

    return {
      flashloanTx,
      feedCrankTxs,
      addressLookupTableAccounts: [...clientLookupTables, ...swapLookupTables, ...feedLuts],
    };
  }

  async makeDepositIx(
    amount: Amount,
    bankAddress: PublicKey,
    opt: MakeDepositIxOpts = {}
  ): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeDepositIx(
      this._program,
      this.client.banks,
      this.client.mintDatas,
      amount,
      bankAddress,
      opt
    );
  }

  async deposit(amount: Amount, bankAddress: PublicKey, opt: MakeDepositIxOpts = {}): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:deposit`);
    debug("Depositing %s into marginfi account (bank: %s)", amount, shortenAddress(bankAddress));
    const priorityFeeIx = this.makePriorityFeeIx(opt.priorityFeeUi);
    const bundleTipIx = makeBundleTipIx(this.client.provider.publicKey);
    const ixs = await this.makeDepositIx(amount, bankAddress, opt);
    const tx = new Transaction().add(bundleTipIx, ...priorityFeeIx, ...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Depositing successful %s", sig);
    return sig;
  }

  async simulateDeposit(amount: Amount, bankAddress: PublicKey): Promise<SimulationResult> {
    const ixs = await this.makeDepositIx(amount, bankAddress);
    const tx = new Transaction().add(...ixs.instructions);
    const [mfiAccountData, bankData] = await this.client.simulateTransactions([tx], [this.address, bankAddress]);
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate deposit");
    const previewBanks = this.client.banks;
    previewBanks.set(
      bankAddress.toBase58(),
      Bank.fromBuffer(bankAddress, bankData, this._program.idl, this.client.feedIdMap)
    );
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

  async makeRepayIx(
    amount: Amount,
    bankAddress: PublicKey,
    repayAll: boolean = false,
    opt: MakeRepayIxOpts = {}
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
      opt
    );
  }

  async repay(
    amount: Amount,
    bankAddress: PublicKey,
    repayAll: boolean = false,
    opt: MakeRepayIxOpts = {}
  ): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:repay`);
    debug("Repaying %s into marginfi account (bank: %s), repay all: %s", amount, bankAddress, repayAll);
    const priorityFeeIx = this.makePriorityFeeIx(opt.priorityFeeUi);
    const bundleTipIx = makeBundleTipIx(this.client.provider.publicKey);
    const ixs = await this.makeRepayIx(amount, bankAddress, repayAll, opt);
    const tx = new Transaction().add(bundleTipIx, ...priorityFeeIx, ...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Depositing successful %s", sig);

    return sig;
  }

  async simulateRepay(amount: Amount, bankAddress: PublicKey, repayAll: boolean = false): Promise<SimulationResult> {
    const ixs = await this.makeRepayIx(amount, bankAddress, repayAll);
    const tx = new Transaction().add(...ixs.instructions);
    const [mfiAccountData, bankData] = await this.client.simulateTransactions([tx], [this.address, bankAddress]);
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate repay");
    const previewBanks = this.client.banks;
    previewBanks.set(
      bankAddress.toBase58(),
      Bank.fromBuffer(bankAddress, bankData, this._program.idl, this.client.feedIdMap)
    );
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

  async makeWithdrawIx(
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false,
    opt: MakeWithdrawIxOpts = {}
  ): Promise<InstructionsWrapper> {
    const tokenProgramAddress = this.client.mintDatas.get(bankAddress.toBase58())?.tokenProgram;
    if (!tokenProgramAddress) throw Error("Withdraw mint not found");

    return this._marginfiAccount.makeWithdrawIx(
      this._program,
      this.client.banks,
      this.client.mintDatas,
      amount,
      bankAddress,
      withdrawAll,
      opt
    );
  }

  async makeWithdrawAllTx(
    banks: {
      amount: Amount;
      bankAddress: PublicKey;
    }[],
    opt: MakeWithdrawIxOpts = {}
  ): Promise<Transaction> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:withdraw`);
    debug("Withdrawing all from marginfi account");
    const priorityFeeIx = this.makePriorityFeeIx(opt.priorityFeeUi);
    const cuRequestIxs = this.makeComputeBudgetIx();
    let ixs = [];
    for (const bank of banks) {
      ixs.push(...(await this.makeWithdrawIx(bank.amount, bank.bankAddress, true, opt)).instructions);
    }
    const tx = new Transaction().add(...priorityFeeIx, ...cuRequestIxs, ...ixs);
    return tx;
  }

  async withdraw(
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false,
    opt: MakeWithdrawIxOpts = {}
  ): Promise<string[]> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:withdraw`);
    debug("Withdrawing %s from marginfi account", amount);

    const { feedCrankTxs, withdrawTx } = await this.makeWithdrawTx(amount, bankAddress, withdrawAll, opt);

    // process multiple transactions if feed updates required
    const sigs = await this.client.processTransactions([...feedCrankTxs, withdrawTx]);

    debug("Withdrawing successful %s", sigs.pop());
    return sigs;
  }

  async makeWithdrawTx(
    amount: Amount,
    bankAddress: PublicKey,
    withdrawAll: boolean = false,
    opt: MakeWithdrawIxOpts = {}
  ): Promise<{
    feedCrankTxs: VersionedTransaction[];
    withdrawTx: VersionedTransaction;
    addressLookupTableAccounts: AddressLookupTableAccount[];
  }> {
    const bundleTipIx = makeBundleTipIx(this.client.provider.publicKey);
    const priorityFeeIxs = this.makePriorityFeeIx(opt.priorityFeeUi);
    const cuRequestIxs = this.makeComputeBudgetIx();
    const { instructions: updateFeedIxs, luts: feedLuts } = await this.makeUpdateFeedIx([]);
    const ixs = await this.makeWithdrawIx(amount, bankAddress, withdrawAll, opt);

    const {
      value: { blockhash },
    } = await this._program.provider.connection.getLatestBlockhashAndContext();

    let feedCrankTxs: VersionedTransaction[] = [];

    if (updateFeedIxs.length > 0) {
      feedCrankTxs.push(
        new VersionedTransaction(
          new TransactionMessage({
            instructions: updateFeedIxs,
            payerKey: this.authority,
            recentBlockhash: blockhash,
          }).compileToV0Message([...feedLuts])
        )
      );
    }

    const withdrawTx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [bundleTipIx, ...cuRequestIxs, ...priorityFeeIxs, ...ixs.instructions],
        payerKey: this.authority,
        recentBlockhash: blockhash,
      }).compileToV0Message([...this.client.addressLookupTables])
    );

    const addressLookupTableAccounts = [...this.client.addressLookupTables, ...feedLuts];

    return { feedCrankTxs, withdrawTx, addressLookupTableAccounts };
  }

  async simulateWithdraw(bankAddress: PublicKey, txs: VersionedTransaction[]): Promise<SimulationResult> {
    const [mfiAccountData, bankData] = await this.client.simulateTransactions(txs, [this.address, bankAddress]);
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate withdraw");
    const previewBanks = this.client.banks;
    previewBanks.set(
      bankAddress.toBase58(),
      Bank.fromBuffer(bankAddress, bankData, this._program.idl, this.client.feedIdMap)
    );
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

  async makeBorrowIx(amount: Amount, bankAddress: PublicKey, opt: MakeBorrowIxOpts = {}): Promise<InstructionsWrapper> {
    const tokenProgramAddress = this.client.mintDatas.get(bankAddress.toBase58())?.tokenProgram;
    if (!tokenProgramAddress) throw Error("Borrow mint not found");

    return this._marginfiAccount.makeBorrowIx(
      this._program,
      this.client.banks,
      this.client.mintDatas,
      amount,
      bankAddress,
      opt
    );
  }

  async borrow(amount: Amount, bankAddress: PublicKey, opt: MakeBorrowIxOpts = {}): Promise<string[]> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:borrow`);
    debug("Borrowing %s from marginfi account", amount);

    const { feedCrankTxs, borrowTx } = await this.makeBorrowTx(amount, bankAddress, opt);

    // process multiple transactions if feed updates required
    const sigs = await this.client.processTransactions([...feedCrankTxs, borrowTx]);
    debug("Borrowing successful %s", sigs);
    return sigs;
  }

  async makeBorrowTx(
    amount: Amount,
    bankAddress: PublicKey,
    opt: MakeBorrowIxOpts = {}
  ): Promise<{
    feedCrankTxs: VersionedTransaction[];
    borrowTx: VersionedTransaction;
    addressLookupTableAccounts: AddressLookupTableAccount[];
  }> {
    const bundleTipIx = makeBundleTipIx(this.client.provider.publicKey);
    const priorityFeeIxs = this.makePriorityFeeIx(opt.priorityFeeUi);
    const cuRequestIxs = this.makeComputeBudgetIx();
    const { instructions: updateFeedIxs, luts: feedLuts } = await this.makeUpdateFeedIx([bankAddress]);
    const ixs = await this.makeBorrowIx(amount, bankAddress, opt);

    const {
      value: { blockhash },
    } = await this._program.provider.connection.getLatestBlockhashAndContext();

    let feedCrankTxs: VersionedTransaction[] = [];

    if (updateFeedIxs.length > 0) {
      feedCrankTxs.push(
        new VersionedTransaction(
          new TransactionMessage({
            instructions: updateFeedIxs,
            payerKey: this.authority,
            recentBlockhash: blockhash,
          }).compileToV0Message([...feedLuts])
        )
      );
    }

    const borrowTx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [bundleTipIx, ...cuRequestIxs, ...priorityFeeIxs, ...ixs.instructions],
        payerKey: this.authority,
        recentBlockhash: blockhash,
      }).compileToV0Message([...this.client.addressLookupTables])
    );

    const addressLookupTableAccounts = [...this.client.addressLookupTables, ...feedLuts];

    return { feedCrankTxs, borrowTx, addressLookupTableAccounts };
  }

  async simulateBorrow(bankAddress: PublicKey, transactions: VersionedTransaction[]): Promise<SimulationResult> {
    const [mfiAccountData, bankData] = await this.client.simulateTransactions(transactions, [
      this.address,
      bankAddress,
    ]);
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate borrow");
    const previewBanks = this.client.banks;
    previewBanks.set(
      bankAddress.toBase58(),
      Bank.fromBuffer(bankAddress, bankData, this._program.idl, this.client.feedIdMap)
    );
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

  async makeWithdrawEmissionsIx(bankAddress: PublicKey): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeWithdrawEmissionsIx(
      this._program,
      this.client.banks,
      this.client.mintDatas,
      bankAddress
    );
  }

  async withdrawEmissions(bankAddresses: PublicKey[], priorityFeeUi?: number): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:withdraw-emissions`);
    debug("Withdrawing emission from marginfi account (bank: %s)", bankAddresses.map((b) => b.toBase58()).join(", "));
    const bundleTipIx = makeBundleTipIx(this.client.provider.publicKey);
    const priorityFeeIx = this.makePriorityFeeIx(priorityFeeUi);
    const ixs: TransactionInstruction[] = [];
    const signers = [];
    for (const bankAddress of bankAddresses) {
      const ix = await this.makeWithdrawEmissionsIx(bankAddress);
      ixs.push(...ix.instructions);
      signers.push(ix.keys);
    }
    const tx = new Transaction().add(bundleTipIx, ...priorityFeeIx, ...ixs);
    const sig = await this.client.processTransaction(tx, []);
    debug("Withdrawing emission successful %s", sig);
    return sig;
  }

  public async makeLendingAccountLiquidateIx(
    liquidateeMarginfiAccount: MarginfiAccount,
    assetBankAddress: PublicKey,
    assetQuantityUi: Amount,
    liabBankAddress: PublicKey
  ): Promise<InstructionsWrapper> {
    const liabTokenProgramAddress = this.client.mintDatas.get(liabBankAddress.toBase58())?.tokenProgram;
    if (!liabTokenProgramAddress) throw Error("Liability mint not found");

    return this._marginfiAccount.makeLendingAccountLiquidateIx(
      liquidateeMarginfiAccount,
      this._program,
      this.client.banks,
      this.client.mintDatas,
      assetBankAddress,
      assetQuantityUi,
      liabBankAddress
    );
  }

  public async lendingAccountLiquidate(
    liquidateeMarginfiAccount: MarginfiAccount,
    assetBankAddress: PublicKey,
    assetQuantityUi: Amount,
    liabBankAddress: PublicKey
  ): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:liquidation`);
    debug("Liquidating marginfi account %s", liquidateeMarginfiAccount.address.toBase58());
    const ixw = await this.makeLendingAccountLiquidateIx(
      liquidateeMarginfiAccount,
      assetBankAddress,
      assetQuantityUi,
      liabBankAddress
    );
    const tx = new Transaction().add(...ixw.instructions);
    const sig = await this.client.processTransaction(tx, []);
    debug("Liquidation successful %s", sig);
    return sig;
  }

  public async makeBeginFlashLoanIx(endIndex: number): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeBeginFlashLoanIx(this._program, endIndex);
  }

  public async makeEndFlashLoanIx(projectedActiveBalances: PublicKey[]): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeEndFlashLoanIx(this._program, this.client.banks, projectedActiveBalances);
  }

  public async flashLoan(args: FlashLoanArgs): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:flashLoan`);
    debug("Executing flashloan from marginfi account");
    const lookupTables = this.client.addressLookupTables;
    const tx = await this.buildFlashLoanTx(args, lookupTables);
    const sig = await this.client.processTransaction(tx, []);
    debug("Flashloan successful %s", sig);
    return sig;
  }

  public async buildFlashLoanTx(
    args: FlashLoanArgs,
    lookupTables?: AddressLookupTableAccount[]
  ): Promise<VersionedTransaction> {
    const endIndex = args.ixs.length + 1;

    const projectedActiveBalances: PublicKey[] = this._marginfiAccount.projectActiveBalancesNoCpi(
      this._program,
      args.ixs
    );

    const beginFlashLoanIx = await this.makeBeginFlashLoanIx(endIndex);
    const endFlashLoanIx = await this.makeEndFlashLoanIx(projectedActiveBalances);

    const ixs = [...beginFlashLoanIx.instructions, ...args.ixs, ...endFlashLoanIx.instructions];

    const { blockhash } = await this._program.provider.connection.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: this.client.wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: ixs,
    }).compileToV0Message([...(lookupTables ?? []), ...(args.addressLookupTableAccounts ?? [])]);

    const tx = new VersionedTransaction(message);

    if (args.signers) {
      tx.sign(args.signers);
    }

    return tx;
  }

  public async makeTransferAccountAuthorityIx(newAccountAuthority: PublicKey): Promise<InstructionsWrapper> {
    return this._marginfiAccount.makeAccountAuthorityTransferIx(this._program, newAccountAuthority);
  }

  async transferAccountAuthority(newAccountAuthority: PublicKey): Promise<string> {
    const debug = require("debug")(`mfi:margin-account:${this.address.toString()}:transfer-authority`);
    debug("Transferring account %s to %s", this.address.toBase58(), newAccountAuthority.toBase58());
    const ixs = await this.makeTransferAccountAuthorityIx(newAccountAuthority);
    const tx = new Transaction().add(...ixs.instructions);
    const sig = await this.client.processTransaction(tx, []);
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

    if (swbPullBanks.length > 0) {
      const staleOracles = swbPullBanks
        .filter((bank) => {
          const oraclePrice = this.client.oraclePrices.get(bank.address.toBase58());
          const maxAge = bank.config.oracleMaxAge;
          const currentTime = Math.round(Date.now() / 1000);
          const oracleTime = Math.round(
            oraclePrice?.timestamp ? oraclePrice.timestamp.toNumber() : new Date().getTime()
          );
          const adjustedMaxAge = Math.max(maxAge - txLandingBuffer, 0);
          const isStale = currentTime - oracleTime > adjustedMaxAge;

          return isStale;
        })
        .map((bank) => bank.oracleKey);

      if (staleOracles.length > 0) {
        const sbProgram = getSwitchboardProgram(this._program.provider);
        const [pullIx, luts] = await sb.PullFeed.fetchUpdateManyIx(sbProgram, {
          feeds: staleOracles,
          numSignatures: 1,
        });

        const cuRequestIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 });
        return { instructions: [cuRequestIx, pullIx], luts };
      }

      return { instructions: [], luts: [] };
    } else {
      return { instructions: [], luts: [] };
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  getHealthCheckAccounts(mandatoryBanks: Bank[] = [], excludedBanks: Bank[] = []): AccountMeta[] {
    return this._marginfiAccount.getHealthCheckAccounts(this.client.banks, mandatoryBanks, excludedBanks);
  }

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
    this._marginfiAccount = new MarginfiAccount(this.address, data);
  }

  public describe(): string {
    return this._marginfiAccount.describe(this.client.banks, this.client.oraclePrices);
  }
}

export function makeBundleTipIx(feePayer: PublicKey): TransactionInstruction {
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
    lamports: 10_000, // 1000 lamports = 0.000001 SOL
  });
}

export { MarginfiAccountWrapper };
