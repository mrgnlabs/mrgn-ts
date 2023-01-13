import { Program, AnchorProvider, BN, Address } from '@project-serum/anchor';
import { PublicKey, ConfirmOptions, TransactionInstruction, Keypair, Commitment, AccountMeta, Connection, Transaction, Signer, TransactionSignature, VersionedTransaction, SendOptions } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import BigNumber from 'bignumber.js';
import BN$1 from 'bn.js';
import { PriceData } from '@pythnetwork/client';
import * as superstruct from 'superstruct';
import { Infer } from 'superstruct';

declare type Marginfi = {
    version: "0.1.0";
    name: "marginfi";
    instructions: [
        {
            name: "initializeMarginfiGroup";
            docs: ["Initialize a new Marginfi Group with initial config"];
            accounts: [
                {
                    name: "marginfiGroup";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "admin";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "systemProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [];
        },
        {
            name: "configureMarginfiGroup";
            docs: ["Configure a Marginfi Group"];
            accounts: [
                {
                    name: "marginfiGroup";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "admin";
                    isMut: false;
                    isSigner: true;
                }
            ];
            args: [
                {
                    name: "config";
                    type: {
                        defined: "GroupConfig";
                    };
                }
            ];
        },
        {
            name: "lendingPoolAddBank";
            docs: ["Add a new bank to the Marginfi Group"];
            accounts: [
                {
                    name: "marginfiGroup";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "admin";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "bankMint";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "bank";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "liquidityVaultAuthority";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "liquidityVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "insuranceVaultAuthority";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "insuranceVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "feeVaultAuthority";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "feeVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "pythOracle";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "rent";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "tokenProgram";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "systemProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [
                {
                    name: "bankConfig";
                    type: {
                        defined: "BankConfig";
                    };
                }
            ];
        },
        {
            name: "lendingPoolConfigureBank";
            docs: ["Configure a bank in the Marginfi Group"];
            accounts: [
                {
                    name: "marginfiGroup";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "admin";
                    isMut: false;
                    isSigner: true;
                },
                {
                    name: "bank";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "pythOracle";
                    isMut: false;
                    isSigner: false;
                    docs: [
                        "Set only if pyth oracle is being changed otherwise can be a random account."
                    ];
                }
            ];
            args: [
                {
                    name: "bankConfigOpt";
                    type: {
                        defined: "BankConfigOpt";
                    };
                }
            ];
        },
        {
            name: "lendingPoolHandleBankruptcy";
            docs: [
                "Handle bad debt of a bankrupt marginfi account for a given bank."
            ];
            accounts: [
                {
                    name: "marginfiGroup";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "admin";
                    isMut: false;
                    isSigner: true;
                },
                {
                    name: "bank";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "marginfiAccount";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "liquidityVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "insuranceVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "insuranceVaultAuthority";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "tokenProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [];
        },
        {
            name: "initializeMarginfiAccount";
            docs: ["Initialize a marginfi account for a given group"];
            accounts: [
                {
                    name: "marginfiGroup";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "marginfiAccount";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "signer";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "systemProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [];
        },
        {
            name: "bankDeposit";
            docs: [
                "Deposit assets into a lending account",
                "Repay borrowed assets, if any exist."
            ];
            accounts: [
                {
                    name: "marginfiGroup";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "marginfiAccount";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "signer";
                    isMut: false;
                    isSigner: true;
                },
                {
                    name: "bank";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "signerTokenAccount";
                    isMut: true;
                    isSigner: false;
                    docs: ["Token mint/authority are checked at transfer"];
                },
                {
                    name: "bankLiquidityVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "tokenProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [
                {
                    name: "amount";
                    type: "u64";
                }
            ];
        },
        {
            name: "bankWithdraw";
            docs: [
                "Withdraw assets from a lending account",
                "Withdraw deposited assets, if any exist, otherwise borrow assets.",
                "Account health checked."
            ];
            accounts: [
                {
                    name: "marginfiGroup";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "marginfiAccount";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "signer";
                    isMut: false;
                    isSigner: true;
                },
                {
                    name: "bank";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "destinationTokenAccount";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "bankLiquidityVaultAuthority";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "bankLiquidityVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "tokenProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [
                {
                    name: "amount";
                    type: "u64";
                }
            ];
        },
        {
            name: "lendingAccountLiquidate";
            docs: [
                "Liquidate a lending account balance of an unhealthy marginfi account"
            ];
            accounts: [
                {
                    name: "marginfiGroup";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "assetBank";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "assetPriceFeed";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "liabBank";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "liabPriceFeed";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "liquidatorMarginfiAccount";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "signer";
                    isMut: false;
                    isSigner: true;
                },
                {
                    name: "liquidateeMarginfiAccount";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "bankLiquidityVaultAuthority";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "bankLiquidityVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "bankInsuranceVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "tokenProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [
                {
                    name: "assetAmount";
                    type: "u64";
                }
            ];
        },
        {
            name: "bankAccrueInterest";
            accounts: [
                {
                    name: "marginfiGroup";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "bank";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "liquidityVaultAuthority";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "liquidityVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "insuranceVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "feeVault";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "tokenProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [];
        }
    ];
    accounts: [
        {
            name: "marginfiAccount";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "group";
                        type: "publicKey";
                    },
                    {
                        name: "authority";
                        type: "publicKey";
                    },
                    {
                        name: "lendingAccount";
                        type: {
                            defined: "LendingAccount";
                        };
                    }
                ];
            };
        },
        {
            name: "marginfiGroup";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "admin";
                        type: "publicKey";
                    }
                ];
            };
        },
        {
            name: "bank";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "mint";
                        type: "publicKey";
                    },
                    {
                        name: "mintDecimals";
                        type: "u8";
                    },
                    {
                        name: "group";
                        type: "publicKey";
                    },
                    {
                        name: "ignore1";
                        type: {
                            array: ["u8", 7];
                        };
                    },
                    {
                        name: "depositShareValue";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "liabilityShareValue";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "liquidityVault";
                        type: "publicKey";
                    },
                    {
                        name: "liquidityVaultBump";
                        type: "u8";
                    },
                    {
                        name: "liquidityVaultAuthorityBump";
                        type: "u8";
                    },
                    {
                        name: "insuranceVault";
                        type: "publicKey";
                    },
                    {
                        name: "insuranceVaultBump";
                        type: "u8";
                    },
                    {
                        name: "insuranceVaultAuthorityBump";
                        type: "u8";
                    },
                    {
                        name: "feeVault";
                        type: "publicKey";
                    },
                    {
                        name: "feeVaultBump";
                        type: "u8";
                    },
                    {
                        name: "feeVaultAuthorityBump";
                        type: "u8";
                    },
                    {
                        name: "ignore2";
                        type: {
                            array: ["u8", 2];
                        };
                    },
                    {
                        name: "config";
                        type: {
                            defined: "BankConfig";
                        };
                    },
                    {
                        name: "totalLiabilityShares";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "totalDepositShares";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "lastUpdate";
                        type: "i64";
                    }
                ];
            };
        }
    ];
    types: [
        {
            name: "LendingAccount";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "balances";
                        type: {
                            array: [
                                {
                                    defined: "Balance";
                                },
                                16
                            ];
                        };
                    }
                ];
            };
        },
        {
            name: "Balance";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "active";
                        type: "bool";
                    },
                    {
                        name: "bankPk";
                        type: "publicKey";
                    },
                    {
                        name: "ignore";
                        type: {
                            array: ["u8", 7];
                        };
                    },
                    {
                        name: "depositShares";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "liabilityShares";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    }
                ];
            };
        },
        {
            name: "GroupConfig";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "admin";
                        type: {
                            option: "publicKey";
                        };
                    }
                ];
            };
        },
        {
            name: "InterestRateConfig";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "optimalUtilizationRate";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "plateauInterestRate";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "maxInterestRate";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "insuranceFeeFixedApr";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "insuranceIrFee";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "protocolFixedFeeApr";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "protocolIrFee";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    }
                ];
            };
        },
        {
            name: "BankConfig";
            docs: [
                "TODO: Convert weights to (u64, u64) to avoid precision loss (maybe?)"
            ];
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "depositWeightInit";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "depositWeightMaint";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "liabilityWeightInit";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "liabilityWeightMaint";
                        type: {
                            defined: "WrappedI80F48";
                        };
                    },
                    {
                        name: "maxCapacity";
                        type: "u64";
                    },
                    {
                        name: "pythOracle";
                        type: "publicKey";
                    },
                    {
                        name: "interestRateConfig";
                        type: {
                            defined: "InterestRateConfig";
                        };
                    }
                ];
            };
        },
        {
            name: "WrappedI80F48";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "value";
                        type: "i128";
                    }
                ];
            };
        },
        {
            name: "BankConfigOpt";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "depositWeightInit";
                        type: {
                            option: {
                                defined: "WrappedI80F48";
                            };
                        };
                    },
                    {
                        name: "depositWeightMaint";
                        type: {
                            option: {
                                defined: "WrappedI80F48";
                            };
                        };
                    },
                    {
                        name: "liabilityWeightInit";
                        type: {
                            option: {
                                defined: "WrappedI80F48";
                            };
                        };
                    },
                    {
                        name: "liabilityWeightMaint";
                        type: {
                            option: {
                                defined: "WrappedI80F48";
                            };
                        };
                    },
                    {
                        name: "maxCapacity";
                        type: {
                            option: "u64";
                        };
                    },
                    {
                        name: "pythOracle";
                        type: {
                            option: "publicKey";
                        };
                    }
                ];
            };
        },
        {
            name: "WeightType";
            type: {
                kind: "enum";
                variants: [
                    {
                        name: "Initial";
                    },
                    {
                        name: "Maintenance";
                    }
                ];
            };
        },
        {
            name: "RiskRequirementType";
            type: {
                kind: "enum";
                variants: [
                    {
                        name: "Initial";
                    },
                    {
                        name: "Maintenance";
                    }
                ];
            };
        },
        {
            name: "BankVaultType";
            type: {
                kind: "enum";
                variants: [
                    {
                        name: "Liquidity";
                    },
                    {
                        name: "Insurance";
                    },
                    {
                        name: "Fee";
                    }
                ];
            };
        }
    ];
    errors: [
        {
            code: 6000;
            name: "MathError";
            msg: "Math error";
        },
        {
            code: 6001;
            name: "BankNotFound";
            msg: "Invalid bank index";
        },
        {
            code: 6002;
            name: "LendingAccountBalanceNotFound";
            msg: "Lending account balance not found";
        },
        {
            code: 6003;
            name: "BankDepositCapacityExceeded";
            msg: "Bank deposit capacity exceeded";
        },
        {
            code: 6004;
            name: "InvalidTransfer";
            msg: "Invalid transfer";
        },
        {
            code: 6005;
            name: "MissingPythOrBankAccount";
            msg: "Missing Pyth or Bank account";
        },
        {
            code: 6006;
            name: "MissingPythAccount";
            msg: "Missing Pyth account";
        },
        {
            code: 6007;
            name: "InvalidPythAccount";
            msg: "Invalid Pyth account";
        },
        {
            code: 6008;
            name: "MissingBankAccount";
            msg: "Missing Bank account";
        },
        {
            code: 6009;
            name: "InvalidBankAccount";
            msg: "Invalid Bank account";
        },
        {
            code: 6010;
            name: "BadAccountHealth";
            msg: "Bad account health";
        },
        {
            code: 6011;
            name: "LendingAccountBalanceSlotsFull";
            msg: "Lending account balance slots are full";
        },
        {
            code: 6012;
            name: "BankAlreadyExists";
            msg: "Bank already exists";
        },
        {
            code: 6013;
            name: "BorrowingNotAllowed";
            msg: "Borrowing not allowed";
        },
        {
            code: 6014;
            name: "AccountIllegalPostLiquidationState";
            msg: "Illegal post liquidation state, account is either not unhealthy or liquidation was too big";
        },
        {
            code: 6015;
            name: "AccountNotBankrupt";
            msg: "Account is not bankrupt";
        },
        {
            code: 6016;
            name: "BalanceNotBadDebt";
            msg: "Account balance is not bad debt";
        },
        {
            code: 6017;
            name: "InvalidConfig";
            msg: "Invalid group config";
        },
        {
            code: 6018;
            name: "StaleOracle";
            msg: "Stale oracle data";
        }
    ];
};
declare const IDL: Marginfi;

declare type MarginfiProgram = Omit<Program<Marginfi>, "provider"> & {
    provider: AnchorProvider;
};
declare type MarginfiReadonlyProgram = Program<Marginfi>;
declare type UiAmount = BigNumber | number | string;
declare type Wallet = Pick<SignerWalletAdapter, "signAllTransactions" | "signTransaction"> & {
    publicKey: PublicKey;
};
interface TransactionOptions extends ConfirmOptions {
    dryRun?: boolean;
}
/**
 * Supported config environments.
 */
declare type Environment = "devnet1";
/**
 * Marginfi bank vault type
 */
declare enum BankVaultType {
    LiquidityVault = 0,
    InsuranceVault = 1,
    FeeVault = 2
}
interface MarginfiConfig {
    environment: Environment;
    cluster: string;
    programId: PublicKey;
    groupPk: PublicKey;
    banks: BankAddress[];
}
interface BankAddress {
    label: string;
    address: PublicKey;
}
interface InstructionsWrapper {
    instructions: TransactionInstruction[];
    keys: Keypair[];
}
interface InstructionsWrapper {
    instructions: TransactionInstruction[];
    keys: Keypair[];
}
declare enum AccountType {
    MarginfiGroup = "marginfiGroup",
    MarginfiAccount = "marginfiAccount"
}
interface WrappedI80F48 {
    value: BN;
}

/**
 * Wrapper class around a specific marginfi marginfi account.
 */
declare class MarginfiAccount {
    readonly client: MarginfiClient;
    readonly publicKey: PublicKey;
    private _group;
    private _authority;
    private _lendingAccount;
    /**
     * @internal
     */
    private constructor();
    /**
     * Marginfi account authority address
     */
    get authority(): PublicKey;
    /**
     * Marginfi group address
     */
    get group(): MarginfiGroup;
    /**
     * Marginfi group address
     */
    get lendingAccount(): Balance[];
    /** @internal */
    private get _program();
    /** @internal */
    private get _config();
    /**
     * MarginfiAccount network factory
     *
     * Fetch account data according to the config and instantiate the corresponding MarginfiAccount.
     *
     * @param marginfiAccountPk Address of the target account
     * @param client marginfi client
     * @returns MarginfiAccount instance
     */
    static fetch(marginfiAccountPk: Address, client: MarginfiClient, commitment?: Commitment): Promise<MarginfiAccount>;
    /**
     * MarginfiAccount local factory (decoded)
     *
     * Instantiate a MarginfiAccount according to the provided decoded data.
     * Check sanity against provided config.
     *
     * @param marginfiAccountPk Address of the target account
     * @param client marginfi client
     * @param accountData Decoded marginfi marginfi account data
     * @param marginfiGroup MarginfiGroup instance
     * @returns MarginfiAccount instance
     */
    static fromAccountData(marginfiAccountPk: Address, client: MarginfiClient, accountData: MarginfiAccountData, marginfiGroup: MarginfiGroup): MarginfiAccount;
    /**
     * MarginfiAccount local factory (encoded)
     *
     * Instantiate a MarginfiAccount according to the provided encoded data.
     * Check sanity against provided config.
     *
     * @param marginfiAccountPk Address of the target account
     * @param config marginfi config
     * @param program marginfi Anchor program
     * @param marginfiAccountRawData Encoded marginfi marginfi account data
     * @param marginfiGroup MarginfiGroup instance
     * @returns MarginfiAccount instance
     */
    static fromAccountDataRaw(marginfiAccountPk: PublicKey, client: MarginfiClient, marginfiAccountRawData: Buffer, marginfiGroup: MarginfiGroup): MarginfiAccount;
    /**
     * Create transaction instruction to deposit collateral into the marginfi account.
     *
     * @param amount Amount to deposit (UI unit)
     * @param bank Bank to deposit to
     * @returns `MarginDepositCollateral` transaction instruction
     */
    makeDepositIx(amount: UiAmount, bank: Bank): Promise<InstructionsWrapper>;
    /**
     * Deposit collateral into the marginfi account.
     *
     * @param amount Amount to deposit (UI unit)
     * @param bank Bank to deposit to
     * @returns Transaction signature
     */
    deposit(amount: UiAmount, bank: Bank): Promise<string>;
    /**
     * Create transaction instruction to withdraw collateral from the marginfi account.
     *
     * @param amount Amount to withdraw (mint native unit)
     * @param bank Bank to withdraw from
     * @returns `MarginWithdrawCollateral` transaction instruction
     */
    makeWithdrawIx(amount: UiAmount, bank: Bank): Promise<InstructionsWrapper>;
    /**
     * Withdraw collateral from the marginfi account.
     *
     * @param amount Amount to withdraw (UI unit)
     * @param bank Bank to withdraw from
     * @returns Transaction signature
     */
    withdraw(amount: UiAmount, bank: Bank): Promise<string>;
    getHealthCheckAccounts(mandatoryBanks?: Bank[]): AccountMeta[];
    /**
     * Fetch marginfi account data.
     * Check sanity against provided config.
     *
     * @param config marginfi config
     * @param program marginfi Anchor program
     * @returns Decoded marginfi account data struct
     */
    private static _fetchAccountData;
    /**
     * Decode marginfi account data according to the Anchor IDL.
     *
     * @param encoded Raw data buffer
     * @returns Decoded marginfi account data struct
     */
    static decode(encoded: Buffer): MarginfiAccountData;
    /**
     * Decode marginfi account data according to the Anchor IDL.
     *
     * @param decoded Marginfi account data struct
     * @returns Raw data buffer
     */
    static encode(decoded: MarginfiAccountData): Promise<Buffer>;
    /**
     * Update instance data by fetching and storing the latest on-chain state.
     */
    reload(): Promise<void>;
    /**
     * Update instance data from provided data struct.
     *
     * @param data Marginfi account data struct
     */
    private _updateFromAccountData;
    private _loadGroupAndAccountAi;
    getHealthComponents(marginReqType: MarginRequirementType): {
        assets: BigNumber;
        liabilities: BigNumber;
    };
    getActiveBalances(): Balance[];
    canBeLiquidated(): boolean;
    getBalance(bankPk: PublicKey): Balance;
    getFreeCollateral(): BigNumber;
    private _getHealthComponentsWithoutBias;
    computeApy(): number;
    /**
     * Calculate the maximum amount of asset that can be withdrawn from a bank given existing deposits of the asset
     * and the untied collateral of the margin account.
     *
     * fc = free collateral
     * ucb = untied collateral for bank
     *
     * q = (min(fc, ucb) / (price_lowest_bias * deposit_weight)) + (fc - min(fc, ucb)) / (price_highest_bias * liab_weight)
     *
     *
     *
     * NOTE FOR LIQUIDATORS
     * This function doesn't take into account the collateral received when liquidating an account.
     */
    getMaxWithdrawForBank(bank: Bank): BigNumber;
    makeLendingAccountLiquidateIx(liquidateeMarginfiAccount: MarginfiAccount, assetBank: Bank, assetQuantityUi: UiAmount, liabBank: Bank): Promise<InstructionsWrapper>;
    lendingAccountLiquidate(liquidateeMarginfiAccount: MarginfiAccount, assetBank: Bank, assetQuantityUi: UiAmount, liabBank: Bank): Promise<string>;
    toString(): string;
}

declare class Balance {
    active: boolean;
    bankPk: PublicKey;
    depositShares: BigNumber;
    liabilityShares: BigNumber;
    constructor(data: BalanceData);
    static newEmpty(bankPk: PublicKey): Balance;
    getUsdValue(bank: Bank, marginReqType: MarginRequirementType): {
        assets: BigNumber;
        liabilities: BigNumber;
    };
    getUsdValueWithPriceBias(bank: Bank, marginReqType: MarginRequirementType): {
        assets: BigNumber;
        liabilities: BigNumber;
    };
    getQuantity(bank: Bank): {
        assets: BigNumber;
        liabilities: BigNumber;
    };
}
interface MarginfiAccountData {
    group: PublicKey;
    authority: PublicKey;
    lendingAccount: {
        balances: BalanceData[];
    };
}
interface BalanceData {
    active: boolean;
    bankPk: PublicKey;
    depositShares: WrappedI80F48;
    liabilityShares: WrappedI80F48;
}
declare enum MarginRequirementType {
    Init = 0,
    Maint = 1,
    Equity = 2
}

/**
 * Wrapper class around a specific marginfi group.
 */
declare class Bank {
    readonly publicKey: PublicKey;
    readonly label: string;
    group: PublicKey;
    mint: PublicKey;
    mintDecimals: number;
    depositShareValue: BigNumber;
    liabilityShareValue: BigNumber;
    liquidityVault: PublicKey;
    liquidityVaultBump: number;
    liquidityVaultAuthorityBump: number;
    insuranceVault: PublicKey;
    insuranceVaultBump: number;
    insuranceVaultAuthorityBump: number;
    feeVault: PublicKey;
    feeVaultBump: number;
    feeVaultAuthorityBump: number;
    config: BankConfig;
    totalDepositShares: BigNumber;
    totalLiabilityShares: BigNumber;
    private priceData;
    constructor(label: string, address: PublicKey, rawData: BankData, priceData: PriceData);
    get totalDeposits(): BigNumber;
    get totalLiabilities(): BigNumber;
    reloadPriceData(connection: Connection): Promise<void>;
    getAssetQuantity(depositShares: BigNumber): BigNumber;
    getLiabilityQuantity(liabilityShares: BigNumber): BigNumber;
    getAssetShares(depositValue: BigNumber): BigNumber;
    getLiabilityShares(liabilityValue: BigNumber): BigNumber;
    getAssetUsdValue(depositShares: BigNumber, marginRequirementType: MarginRequirementType, priceBias: PriceBias): BigNumber;
    getLiabilityUsdValue(liabilityShares: BigNumber, marginRequirementType: MarginRequirementType, priceBias: PriceBias): BigNumber;
    getUsdValue(quantity: BigNumber, priceBias: PriceBias, weight?: BigNumber): BigNumber;
    getPrice(priceBias: PriceBias): BigNumber;
    getAssetWeight(marginRequirementType: MarginRequirementType): BigNumber;
    getLiabilityWeight(marginRequirementType: MarginRequirementType): BigNumber;
    getQuantityFromUsdValue(usdValue: BigNumber, priceBias: PriceBias): BigNumber;
    getInterestRates(): {
        lendingRate: BigNumber;
        borrowingRate: BigNumber;
    };
    private interestRateCurve;
    private getUtilizationRate;
}

interface BankConfig {
    depositWeightInit: BigNumber;
    depositWeightMaint: BigNumber;
    liabilityWeightInit: BigNumber;
    liabilityWeightMaint: BigNumber;
    maxCapacity: number;
    pythOracle: PublicKey;
    interestRateConfig: InterestRateConfig;
}
interface InterestRateConfig {
    optimalUtilizationRate: BigNumber;
    plateauInterestRate: BigNumber;
    maxInterestRate: BigNumber;
    insuranceFeeFixedApr: BigNumber;
    insuranceIrFee: BigNumber;
    protocolFixedFeeApr: BigNumber;
    protocolIrFee: BigNumber;
}
interface BankData {
    mint: PublicKey;
    mintDecimals: number;
    group: PublicKey;
    depositShareValue: WrappedI80F48;
    liabilityShareValue: WrappedI80F48;
    liquidityVault: PublicKey;
    liquidityVaultBump: number;
    liquidityVaultAuthorityBump: number;
    insuranceVault: PublicKey;
    insuranceVaultBump: number;
    insuranceVaultAuthorityBump: number;
    feeVault: PublicKey;
    feeVaultBump: number;
    feeVaultAuthorityBump: number;
    config: BankConfigData;
    totalLiabilityShares: WrappedI80F48;
    totalDepositShares: WrappedI80F48;
    lastUpdate: BN$1;
}
interface BankConfigData {
    depositWeightInit: WrappedI80F48;
    depositWeightMaint: WrappedI80F48;
    liabilityWeightInit: WrappedI80F48;
    liabilityWeightMaint: WrappedI80F48;
    maxCapacity: BN$1;
    pythOracle: PublicKey;
    interestRateConfig: InterestRateConfigData;
}
interface InterestRateConfigData {
    optimalUtilizationRate: WrappedI80F48;
    plateauInterestRate: WrappedI80F48;
    maxInterestRate: WrappedI80F48;
    insuranceFeeFixedApr: WrappedI80F48;
    insuranceIrFee: WrappedI80F48;
    protocolFixedFeeApr: WrappedI80F48;
    protocolIrFee: WrappedI80F48;
}
declare enum PriceBias {
    Lowest = 0,
    None = 1,
    Highest = 2
}

/**
 * Wrapper class around a specific marginfi group.
 */
declare class MarginfiGroup {
    readonly publicKey: PublicKey;
    private _program;
    private _config;
    private _admin;
    private _banks;
    /**
     * @internal
     */
    private constructor();
    /**
     * Marginfi account authority address
     */
    get admin(): PublicKey;
    get banks(): Map<string, Bank>;
    /**
     * MarginfiGroup network factory
     *
     * Fetch account data according to the config and instantiate the corresponding MarginfiGroup.
     *
     * @param config marginfi config
     * @param program marginfi Anchor program
     * @return MarginfiGroup instance
     */
    static fetch(config: MarginfiConfig, program: MarginfiProgram, commitment?: Commitment): Promise<MarginfiGroup>;
    /**
     * MarginfiGroup local factory (decoded)
     *
     * Instantiate a MarginfiGroup according to the provided decoded data.
     * Check sanity against provided config.
     *
     * @param config marginfi config
     * @param program marginfi Anchor program
     * @param accountData Decoded marginfi group data
     * @return MarginfiGroup instance
     */
    static fromAccountData(config: MarginfiConfig, program: MarginfiProgram, accountData: MarginfiGroupData, banks: Bank[]): MarginfiGroup;
    /**
     * MarginfiGroup local factory (encoded)
     *
     * Instantiate a MarginfiGroup according to the provided encoded data.
     * Check sanity against provided config.
     *
     * @param config marginfi config
     * @param program marginfi Anchor program
     * @param data Encoded marginfi group data
     * @return MarginfiGroup instance
     */
    static fromAccountDataRaw(config: MarginfiConfig, program: MarginfiProgram, rawData: Buffer, banks: Bank[]): MarginfiGroup;
    /**
     * Fetch marginfi group account data according to the config.
     * Check sanity against provided config.
     *
     * @param config marginfi config
     * @param program marginfi Anchor program
     * @return Decoded marginfi group account data struct
     */
    private static _fetchAccountData;
    /**
     * Decode marginfi group account data according to the Anchor IDL.
     *
     * @param encoded Raw data buffer
     * @return Decoded marginfi group account data struct
     */
    static decode(encoded: Buffer): MarginfiGroupData;
    /**
     * Encode marginfi group account data according to the Anchor IDL.
     *
     * @param decoded Encoded marginfi group account data buffer
     * @return Raw data buffer
     */
    static encode(decoded: MarginfiGroupData): Promise<Buffer>;
    /**
     * Update instance data by fetching and storing the latest on-chain state.
     */
    reload(commitment?: Commitment): Promise<void>;
    /**
     * Get bank by label.
     */
    getBankByLabel(label: string): Bank | null;
    /**
     * Update instance data by fetching and storing the latest on-chain state.
     */
    getBankByPk(publicKey: Address): Bank | null;
}

interface MarginfiGroupData {
    admin: PublicKey;
    reservedSpace: BN[];
}

/**
 * Entrypoint to interact with the marginfi contract.
 */
declare class MarginfiClient {
    readonly config: MarginfiConfig;
    readonly program: MarginfiProgram;
    readonly wallet: Wallet;
    readonly programId: PublicKey;
    private _group;
    /**
     * @internal
     */
    private constructor();
    /**
     * MarginfiClient factory
     *
     * Fetch account data according to the config and instantiate the corresponding MarginfiAccount.
     *
     * @param config marginfi config
     * @param wallet User wallet (used to pay fees and sign transations)
     * @param connection Solana web.js Connection object
     * @param opts Solana web.js ConfirmOptions object
     * @returns MarginfiClient instance
     */
    static fetch(config: MarginfiConfig, wallet: Wallet, connection: Connection, opts?: ConfirmOptions): Promise<MarginfiClient>;
    static fromEnv(overrides?: Partial<{
        env: Environment;
        connection: Connection;
        programId: Address;
        marginfiGroup: Address;
        wallet: Wallet;
    }>): Promise<MarginfiClient>;
    /**
     * Marginfi account group address
     */
    get group(): MarginfiGroup;
    get provider(): AnchorProvider;
    /**
     * Create transaction instruction to create a new marginfi account under the authority of the user.
     *
     * @returns transaction instruction
     */
    makeCreateMarginfiAccountIx(marginfiAccountKeypair?: Keypair): Promise<InstructionsWrapper>;
    /**
     * Create a new marginfi account under the authority of the user.
     *
     * @returns MarginfiAccount instance
     */
    createMarginfiAccount(opts?: TransactionOptions): Promise<MarginfiAccount>;
    /**
     * Retrieves the addresses of all marginfi accounts in the udnerlying group.
     *
     * @returns Account addresses
     */
    getAllMarginfiAccountAddresses(): Promise<PublicKey[]>;
    /**
     * Retrieves all marginfi accounts under the specified authority.
     *
     * @returns MarginfiAccount instances
     */
    getMarginfiAccountsForAuthority(authority?: Address): Promise<MarginfiAccount[]>;
    /**
     * Retrieves the addresses of all accounts owned by the marginfi program.
     *
     * @returns Account addresses
     */
    getAllProgramAccountAddresses(type: AccountType): Promise<PublicKey[]>;
    processTransaction(transaction: Transaction, signers?: Array<Signer>, opts?: TransactionOptions): Promise<TransactionSignature>;
}

/**
 * Wrapper class around a specific marginfi marginfi account.
 */
declare class MarginfiAccountReadonly {
    readonly client: MarginfiClientReadonly;
    readonly publicKey: PublicKey;
    private _group;
    private _authority;
    private _lendingAccount;
    /**
     * @internal
     */
    private constructor();
    /**
     * Marginfi account authority address
     */
    get authority(): PublicKey;
    /**
     * Marginfi group address
     */
    get group(): MarginfiGroup;
    /**
     * Marginfi group address
     */
    get lendingAccount(): Balance[];
    /** @internal */
    private get _program();
    /** @internal */
    private get _config();
    /**
     * MarginfiAccount network factory
     *
     * Fetch account data according to the config and instantiate the corresponding MarginfiAccount.
     *
     * @param marginfiAccountPk Address of the target account
     * @param client marginfi client
     * @returns MarginfiAccount instance
     */
    static fetch(marginfiAccountPk: Address, client: MarginfiClientReadonly, commitment?: Commitment): Promise<MarginfiAccountReadonly>;
    /**
     * MarginfiAccount local factory (decoded)
     *
     * Instantiate a MarginfiAccount according to the provided decoded data.
     * Check sanity against provided config.
     *
     * @param marginfiAccountPk Address of the target account
     * @param client marginfi client
     * @param accountData Decoded marginfi marginfi account data
     * @param marginfiGroup MarginfiGroup instance
     * @returns MarginfiAccount instance
     */
    static fromAccountData(marginfiAccountPk: Address, client: MarginfiClientReadonly, accountData: MarginfiAccountData, marginfiGroup: MarginfiGroup): MarginfiAccountReadonly;
    /**
     * MarginfiAccount local factory (encoded)
     *
     * Instantiate a MarginfiAccount according to the provided encoded data.
     * Check sanity against provided config.
     *
     * @param marginfiAccountPk Address of the target account
     * @param config marginfi config
     * @param program marginfi Anchor program
     * @param marginfiAccountRawData Encoded marginfi marginfi account data
     * @param marginfiGroup MarginfiGroup instance
     * @returns MarginfiAccount instance
     */
    static fromAccountDataRaw(marginfiAccountPk: PublicKey, client: MarginfiClientReadonly, marginfiAccountRawData: Buffer, marginfiGroup: MarginfiGroup): MarginfiAccountReadonly;
    /**
     * Fetch marginfi account data.
     * Check sanity against provided config.
     *
     * @param config marginfi config
     * @param program marginfi Anchor program
     * @returns Decoded marginfi account data struct
     */
    private static _fetchAccountData;
    /**
     * Decode marginfi account data according to the Anchor IDL.
     *
     * @param encoded Raw data buffer
     * @returns Decoded marginfi account data struct
     */
    static decode(encoded: Buffer): MarginfiAccountData;
    /**
     * Decode marginfi account data according to the Anchor IDL.
     *
     * @param decoded Marginfi account data struct
     * @returns Raw data buffer
     */
    static encode(decoded: MarginfiAccountData): Promise<Buffer>;
    /**
     * Update instance data by fetching and storing the latest on-chain state.
     */
    reload(): Promise<void>;
    /**
     * Update instance data from provided data struct.
     *
     * @param data Marginfi account data struct
     */
    private _updateFromAccountData;
    private loadGroupAndAccountAi;
    getHealthComponents(marginReqType: MarginRequirementType): {
        assets: BigNumber;
        liabilities: BigNumber;
    };
    canBeLiquidated(): boolean;
    getMaxWithdrawForBank(bank: Bank): BigNumber;
}

/**
 * Entrypoint to interact with the marginfi contract.
 */
declare class MarginfiClientReadonly {
    readonly config: MarginfiConfig;
    readonly program: MarginfiProgram;
    readonly programId: PublicKey;
    private _group;
    /**
     * @internal
     */
    private constructor();
    /**
     * MarginfiClient factory
     *
     * Fetch account data according to the config and instantiate the corresponding MarginfiAccount.
     *
     * @param config marginfi config
     * @param wallet User wallet (used to pay fees and sign transations)
     * @param connection Solana web.js Connection object
     * @param opts Solana web.js ConfirmOptions object
     * @returns MarginfiClient instance
     */
    static fetch(config: MarginfiConfig, connection: Connection, opts?: ConfirmOptions): Promise<MarginfiClientReadonly>;
    static fromEnv(overrides?: Partial<{
        env: Environment;
        connection: Connection;
        programId: Address;
        marginfiGroup: Address;
    }>): Promise<MarginfiClientReadonly>;
    /**
     * Marginfi account group address
     */
    get group(): MarginfiGroup;
    get provider(): AnchorProvider;
    /**
     * Create transaction instruction to create a new marginfi account under the authority of the user.
     *
     * @returns transaction instruction
     */
    makeCreateMarginfiAccountIx(marginfiAccountKeypair?: Keypair): Promise<InstructionsWrapper>;
    /**
     * Retrieves the addresses of all marginfi accounts in the udnerlying group.
     *
     * @returns Account addresses
     */
    getAllMarginfiAccountAddresses(): Promise<PublicKey[]>;
    /**
     * Retrieves all marginfi accounts under the specified authority.
     *
     * @returns MarginfiAccount instances
     */
    getMarginfiAccountsForAuthority(authority: Address): Promise<MarginfiAccountReadonly[]>;
    /**
     * Retrieves the addresses of all accounts owned by the marginfi program.
     *
     * @returns Account addresses
     */
    getAllProgramAccountAddresses(type: AccountType): Promise<PublicKey[]>;
}

/**
 * NodeWallet
 *
 * Anchor-compliant wallet implementation.
 */
declare class NodeWallet implements Wallet {
    readonly payer: Keypair;
    /**
     * @param payer Keypair of the associated payer
     */
    constructor(payer: Keypair);
    /**
     * Factory for the local wallet.
     * Makes use of the `MARGINFI_WALLET` env var, with fallback to `$HOME/.config/solana/id.json`.
     */
    static local(): NodeWallet;
    /**
     * Factory for the Anchor local wallet.
     */
    static anchor(): NodeWallet;
    signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
    get publicKey(): PublicKey;
}

declare const BankConfigRaw: superstruct.Struct<{
    label: string;
    address: string;
}, {
    label: superstruct.Struct<string, null>;
    address: superstruct.Struct<string, null>;
}>;
declare type BankConfigRaw = Infer<typeof BankConfigRaw>;
declare const MarginfiConfigRaw: superstruct.Struct<{
    group: string;
    label: "devnet1";
    cluster: string;
    program: string;
    banks: {
        label: string;
        address: string;
    }[];
}, {
    label: superstruct.Struct<"devnet1", "devnet1">;
    cluster: superstruct.Struct<string, null>;
    program: superstruct.Struct<string, null>;
    group: superstruct.Struct<string, null>;
    banks: superstruct.Struct<{
        label: string;
        address: string;
    }[], superstruct.Struct<{
        label: string;
        address: string;
    }, {
        label: superstruct.Struct<string, null>;
        address: superstruct.Struct<string, null>;
    }>>;
}>;
declare type MarginfiConfigRaw = Infer<typeof MarginfiConfigRaw>;
declare const ConfigRaw: superstruct.Struct<{
    group: string;
    label: "devnet1";
    cluster: string;
    program: string;
    banks: {
        label: string;
        address: string;
    }[];
}[], superstruct.Struct<{
    group: string;
    label: "devnet1";
    cluster: string;
    program: string;
    banks: {
        label: string;
        address: string;
    }[];
}, {
    label: superstruct.Struct<"devnet1", "devnet1">;
    cluster: superstruct.Struct<string, null>;
    program: superstruct.Struct<string, null>;
    group: superstruct.Struct<string, null>;
    banks: superstruct.Struct<{
        label: string;
        address: string;
    }[], superstruct.Struct<{
        label: string;
        address: string;
    }, {
        label: superstruct.Struct<string, null>;
        address: superstruct.Struct<string, null>;
    }>>;
}>>;
declare type ConfigRaw = Infer<typeof ConfigRaw>;
/**
 * Retrieve config per environment
 */
declare function getConfig(environment: Environment, overrides?: Partial<Omit<MarginfiConfig, "environment">>): MarginfiConfig;

declare const PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED: Buffer;
declare const PDA_BANK_INSURANCE_VAULT_AUTH_SEED: Buffer;
declare const PDA_BANK_FEE_VAULT_AUTH_SEED: Buffer;
declare const PDA_BANK_LIQUIDITY_VAULT_SEED: Buffer;
declare const PDA_BANK_INSURANCE_VAULT_SEED: Buffer;
declare const PDA_BANK_FEE_VAULT_SEED: Buffer;
declare const DEFAULT_COMMITMENT: Commitment;
declare const DEFAULT_SEND_OPTS: SendOptions;
declare const DEFAULT_CONFIRM_OPTS: ConfirmOptions;
declare const PYTH_PRICE_CONF_INTERVALS: BigNumber;
declare const USDC_DECIMALS = 6;

/**
 * Load Keypair from the provided file.
 */
declare function loadKeypair(keypairPath: string): Keypair;
/**
 * Transaction processing and error-handling helper.
 */
declare function processTransaction(provider: AnchorProvider, tx: Transaction, signers?: Array<Signer>, opts?: ConfirmOptions): Promise<TransactionSignature>;
/**
 * @internal
 */
declare function sleep(ms: number): Promise<unknown>;
declare function wrappedI80F48toBigNumber({ value }: {
    value: BN;
}, scaleDecimal?: number): BigNumber;
/**
 * Converts a ui representation of a token amount into its native value as `BN`, given the specified mint decimal amount (default to 6 for USDC).
 */
declare function toNumber(amount: UiAmount): number;
/**
 * Converts a ui representation of a token amount into its native value as `BN`, given the specified mint decimal amount (default to 6 for USDC).
 */
declare function toBigNumber(amount: UiAmount | BN): BigNumber;
/**
 * Converts a UI representation of a token amount into its native value as `BN`, given the specified mint decimal amount (default to 6 for USDC).
 */
declare function uiToNative(amount: UiAmount, decimals: number): BN;
/**
 * Converts a native representation of a token amount into its UI value as `number`, given the specified mint decimal amount (default to 6 for USDC).
 */
declare function nativeToUi(amount: UiAmount | BN, decimals: number): number;
/**
 * Compute authority PDA for a specific marginfi group bank vault
 */
declare function getBankVaultAuthority(bankVaultType: BankVaultType, bankPk: PublicKey, programId: PublicKey): [PublicKey, number];
declare function shortenAddress(pubkey: Address, chars?: number): string;

export { AccountType, BankAddress, BankConfigRaw, BankVaultType, ConfigRaw, DEFAULT_COMMITMENT, DEFAULT_CONFIRM_OPTS, DEFAULT_SEND_OPTS, Environment, InstructionsWrapper, IDL as MARGINFI_IDL, MarginfiClient, MarginfiConfig, MarginfiConfigRaw, MarginfiGroup, MarginfiGroupData, Marginfi as MarginfiIdl, MarginfiProgram, MarginfiClientReadonly as MarginfiReadonlyClient, MarginfiReadonlyProgram, NodeWallet, PDA_BANK_FEE_VAULT_AUTH_SEED, PDA_BANK_FEE_VAULT_SEED, PDA_BANK_INSURANCE_VAULT_AUTH_SEED, PDA_BANK_INSURANCE_VAULT_SEED, PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED, PDA_BANK_LIQUIDITY_VAULT_SEED, PYTH_PRICE_CONF_INTERVALS, TransactionOptions, USDC_DECIMALS, UiAmount, Wallet, WrappedI80F48, getBankVaultAuthority, getConfig, loadKeypair, nativeToUi, processTransaction, shortenAddress, sleep, toBigNumber, toNumber, uiToNative, wrappedI80F48toBigNumber };
