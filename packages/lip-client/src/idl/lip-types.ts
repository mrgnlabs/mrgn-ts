/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/liquidity_incentive_program.json`.
 */
export type LiquidityIncentiveProgram = {
  "address": "Lip1111111111111111111111111111111111111111",
  "metadata": {
    "name": "liquidityIncentiveProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createCampaign",
      "docs": [
        "Creates a new liquidity incentive campaign (LIP).",
        "",
        "# Arguments",
        "* `ctx`: Context struct containing the relevant accounts for the campaign.",
        "* `lockup_period`: The length of time (in seconds) that a deposit must be locked up for in order to earn the full reward.",
        "* `max_deposits`: The maximum number of tokens that can be deposited into the campaign by liquidity providers.",
        "* `max_rewards`: The maximum amount of rewards that will be distributed to depositors, and also the amount of token rewards transferred into the vault by the campaign creator.",
        "",
        "# Returns",
        "* `Ok(())` if the campaign was successfully created, or an error otherwise."
      ],
      "discriminator": [
        111,
        131,
        187,
        98,
        160,
        193,
        114,
        244
      ],
      "accounts": [
        {
          "name": "campaign",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaignRewardVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "campaignRewardVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "assetMint",
          "docs": [
            "asserted by comparing the mint of the marginfi bank"
          ]
        },
        {
          "name": "marginfiBank"
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lockupPeriod",
          "type": "u64"
        },
        {
          "name": "maxDeposits",
          "type": "u64"
        },
        {
          "name": "maxRewards",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createDeposit",
      "docs": [
        "Creates a new deposit in an active liquidity incentive campaign (LIP).",
        "",
        "# Arguments",
        "* `ctx`: Context struct containing the relevant accounts for the new deposit",
        "* `amount`: The amount of tokens to be deposited.",
        "",
        "# Returns",
        "* `Ok(())` if the deposit was successfully made, or an error otherwise.",
        "",
        "# Errors",
        "* `LIPError::CampaignNotActive` if the relevant campaign is not active.",
        "* `LIPError::DepositAmountTooLarge` is the deposit amount exceeds the amount of remaining deposits that can be made into the campaign."
      ],
      "discriminator": [
        157,
        30,
        11,
        129,
        16,
        166,
        115,
        75
      ],
      "accounts": [
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "deposit",
          "writable": true,
          "signer": true
        },
        {
          "name": "mfiPdaSigner",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  109,
                  102,
                  105,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "deposit"
              }
            ]
          }
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "tempTokenAccount",
          "writable": true,
          "signer": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "marginfiGroup",
          "docs": [
            "marginfi_bank is tied to a specific marginfi_group"
          ]
        },
        {
          "name": "marginfiBank",
          "writable": true
        },
        {
          "name": "marginfiAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  103,
                  105,
                  110,
                  102,
                  105,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "deposit"
              }
            ]
          }
        },
        {
          "name": "marginfiBankVault",
          "docs": [
            "marginfi_bank_vault is tied to a specific marginfi_bank,",
            "passing in an incorrect vault will fail the CPI call"
          ],
          "writable": true
        },
        {
          "name": "marginfiProgram",
          "address": "Mfi1111111111111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "endDeposit",
      "docs": [
        "After a lockup period has ended, closes a deposit and returns the initial deposit + earned rewards from a liquidity incentive campaign back to the liquidity depositor.",
        "",
        "# Arguments",
        "* ctx: Context of the deposit to be closed",
        "",
        "# Returns",
        "* A Result object which is Ok(()) if the deposit is closed and tokens are transferred successfully.",
        "",
        "# Errors",
        "Returns an error if:",
        "",
        "* Solana clock timestamp is less than the deposit start time plus the lockup period (i.e. the lockup has not been reached)",
        "* Bank redeem shares operation fails",
        "* Reloading ephemeral token account fails",
        "* Transferring additional reward to ephemeral token account fails",
        "* Reloading ephemeral token account after transfer fails"
      ],
      "discriminator": [
        32,
        254,
        86,
        205,
        117,
        110,
        9,
        2
      ],
      "accounts": [
        {
          "name": "campaign"
        },
        {
          "name": "campaignRewardVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "campaignRewardVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "deposit",
          "writable": true
        },
        {
          "name": "mfiPdaSigner",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116,
                  95,
                  109,
                  102,
                  105,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "deposit"
              }
            ]
          }
        },
        {
          "name": "tempTokenAccount",
          "writable": true,
          "signer": true
        },
        {
          "name": "tempTokenAccountAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  112,
                  104,
                  101,
                  109,
                  101,
                  114,
                  97,
                  108,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "deposit"
              }
            ]
          }
        },
        {
          "name": "destinationAccount",
          "writable": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "marginfiAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  103,
                  105,
                  110,
                  102,
                  105,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "deposit"
              }
            ]
          }
        },
        {
          "name": "marginfiGroup"
        },
        {
          "name": "marginfiBank",
          "writable": true
        },
        {
          "name": "marginfiBankVault",
          "writable": true
        },
        {
          "name": "marginfiBankVaultAuthority",
          "writable": true
        },
        {
          "name": "marginfiProgram",
          "address": "Mfi1111111111111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "bank",
      "discriminator": [
        142,
        49,
        166,
        242,
        50,
        66,
        97,
        188
      ]
    },
    {
      "name": "campaign",
      "discriminator": [
        50,
        40,
        49,
        11,
        157,
        220,
        229,
        192
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        148,
        146,
        121,
        66,
        207,
        173,
        21,
        227
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "campaignNotActive",
      "msg": "Campaign is not active"
    },
    {
      "code": 6001,
      "name": "depositAmountTooLarge",
      "msg": "Deposit amount is to large"
    },
    {
      "code": 6002,
      "name": "depositNotMature",
      "msg": "Deposit hasn't matured yet"
    }
  ],
  "types": [
    {
      "name": "bank",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "mintDecimals",
            "type": "u8"
          },
          {
            "name": "group",
            "type": "pubkey"
          },
          {
            "name": "assetShareValue",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "liabilityShareValue",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "liquidityVault",
            "type": "pubkey"
          },
          {
            "name": "liquidityVaultBump",
            "type": "u8"
          },
          {
            "name": "liquidityVaultAuthorityBump",
            "type": "u8"
          },
          {
            "name": "insuranceVault",
            "type": "pubkey"
          },
          {
            "name": "insuranceVaultBump",
            "type": "u8"
          },
          {
            "name": "insuranceVaultAuthorityBump",
            "type": "u8"
          },
          {
            "name": "collectedInsuranceFeesOutstanding",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "feeVault",
            "type": "pubkey"
          },
          {
            "name": "feeVaultBump",
            "type": "u8"
          },
          {
            "name": "feeVaultAuthorityBump",
            "type": "u8"
          },
          {
            "name": "collectedGroupFeesOutstanding",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "totalLiabilityShares",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "totalAssetShares",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "lastUpdate",
            "type": "i64"
          },
          {
            "name": "config",
            "type": {
              "defined": {
                "name": "bankConfig"
              }
            }
          },
          {
            "name": "flags",
            "docs": [
              "Bank Config Flags",
              "",
              "- EMISSIONS_FLAG_BORROW_ACTIVE: 1",
              "- EMISSIONS_FLAG_LENDING_ACTIVE: 2",
              "- PERMISSIONLESS_BAD_DEBT_SETTLEMENT: 4",
              ""
            ],
            "type": "u64"
          },
          {
            "name": "emissionsRate",
            "docs": [
              "Emissions APR.",
              "Number of emitted tokens (emissions_mint) per 1e(bank.mint_decimal) tokens (bank mint) (native amount) per 1 YEAR."
            ],
            "type": "u64"
          },
          {
            "name": "emissionsRemaining",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "emissionsMint",
            "type": "pubkey"
          },
          {
            "name": "padding0",
            "type": {
              "array": [
                {
                  "array": [
                    "u64",
                    2
                  ]
                },
                28
              ]
            }
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                {
                  "array": [
                    "u64",
                    2
                  ]
                },
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "bankConfig",
      "docs": [
        "TODO: Convert weights to (u64, u64) to avoid precision loss (maybe?)"
      ],
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetWeightInit",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "assetWeightMaint",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "liabilityWeightInit",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "liabilityWeightMaint",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "depositLimit",
            "type": "u64"
          },
          {
            "name": "interestRateConfig",
            "type": {
              "defined": {
                "name": "interestRateConfig"
              }
            }
          },
          {
            "name": "operationalState",
            "type": {
              "defined": {
                "name": "bankOperationalState"
              }
            }
          },
          {
            "name": "oracleSetup",
            "type": {
              "defined": {
                "name": "oracleSetup"
              }
            }
          },
          {
            "name": "oracleKeys",
            "type": {
              "array": [
                "pubkey",
                5
              ]
            }
          },
          {
            "name": "borrowLimit",
            "type": "u64"
          },
          {
            "name": "riskTier",
            "type": {
              "defined": {
                "name": "riskTier"
              }
            }
          },
          {
            "name": "totalAssetValueInitLimit",
            "docs": [
              "USD denominated limit for calculating asset value for initialization margin requirements.",
              "Example, if total SOL deposits are equal to $1M and the limit it set to $500K,",
              "then SOL assets will be discounted by 50%.",
              "",
              "In other words the max value of liabilities that can be backed by the asset is $500K.",
              "This is useful for limiting the damage of orcale attacks.",
              "",
              "Value is UI USD value, for example value 100 -> $100"
            ],
            "type": "u64"
          },
          {
            "name": "oracleMaxAge",
            "docs": [
              "Time window in seconds for the oracle price feed to be considered live."
            ],
            "type": "u16"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u16",
                19
              ]
            }
          }
        ]
      }
    },
    {
      "name": "bankOperationalState",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "paused"
          },
          {
            "name": "operational"
          },
          {
            "name": "reduceOnly"
          }
        ]
      }
    },
    {
      "name": "campaign",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "lockupPeriod",
            "type": "u64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "maxDeposits",
            "type": "u64"
          },
          {
            "name": "remainingCapacity",
            "type": "u64"
          },
          {
            "name": "maxRewards",
            "type": "u64"
          },
          {
            "name": "marginfiBankPk",
            "type": "pubkey"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "deposit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "interestRateConfig",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optimalUtilizationRate",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "plateauInterestRate",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "maxInterestRate",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "insuranceFeeFixedApr",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "insuranceIrFee",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "protocolFixedFeeApr",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "protocolIrFee",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                {
                  "array": [
                    "u64",
                    2
                  ]
                },
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "oracleSetup",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "none"
          },
          {
            "name": "pythEma"
          },
          {
            "name": "switchboardV2"
          }
        ]
      }
    },
    {
      "name": "riskTier",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "collateral"
          },
          {
            "name": "isolated"
          }
        ]
      }
    },
    {
      "name": "wrappedI80f48",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c",
        "align": 8
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "campaignAuthSeed",
      "type": "string",
      "value": "\"campaign_auth\""
    },
    {
      "name": "campaignSeed",
      "type": "string",
      "value": "\"campaign\""
    },
    {
      "name": "depositMfiAuthSignerSeed",
      "type": "string",
      "value": "\"deposit_mfi_auth\""
    },
    {
      "name": "marginfiAccountSeed",
      "type": "string",
      "value": "\"marginfi_account\""
    },
    {
      "name": "tempTokenAccountAuthSeed",
      "type": "string",
      "value": "\"ephemeral_token_account_auth\""
    }
  ]
};
