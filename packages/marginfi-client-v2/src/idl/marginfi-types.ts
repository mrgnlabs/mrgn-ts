/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/marginfi.json`.
 */
export type Marginfi = {
  "address": "",
  "metadata": {
    "name": "marginfi",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "lendingAccountBorrow",
      "discriminator": [
        4,
        126,
        116,
        53,
        48,
        5,
        212,
        31
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "bank",
          "writable": true
        },
        {
          "name": "destinationTokenAccount",
          "writable": true
        },
        {
          "name": "bankLiquidityVaultAuthority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "bankLiquidityVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
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
      "name": "lendingAccountCloseBalance",
      "discriminator": [
        245,
        54,
        41,
        4,
        243,
        202,
        31,
        17
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "bank",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "lendingAccountDeposit",
      "discriminator": [
        171,
        94,
        235,
        103,
        82,
        64,
        212,
        140
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "bank",
          "writable": true
        },
        {
          "name": "signerTokenAccount",
          "writable": true
        },
        {
          "name": "bankLiquidityVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
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
      "name": "lendingAccountEndFlashloan",
      "discriminator": [
        105,
        124,
        201,
        106,
        153,
        2,
        8,
        156
      ],
      "accounts": [
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "lendingAccountLiquidate",
      "docs": [
        "Liquidate a lending account balance of an unhealthy marginfi account"
      ],
      "discriminator": [
        214,
        169,
        151,
        213,
        251,
        167,
        86,
        219
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "assetBank",
          "writable": true
        },
        {
          "name": "liabBank",
          "writable": true
        },
        {
          "name": "liquidatorMarginfiAccount",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "liquidateeMarginfiAccount",
          "writable": true
        },
        {
          "name": "bankLiquidityVaultAuthority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "liabBank"
              }
            ]
          }
        },
        {
          "name": "bankLiquidityVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "liabBank"
              }
            ]
          }
        },
        {
          "name": "bankInsuranceVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "liabBank"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "assetAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "lendingAccountRepay",
      "discriminator": [
        79,
        209,
        172,
        177,
        222,
        51,
        173,
        151
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "bank",
          "writable": true
        },
        {
          "name": "signerTokenAccount",
          "writable": true
        },
        {
          "name": "bankLiquidityVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "repayAll",
          "type": {
            "option": "bool"
          }
        }
      ]
    },
    {
      "name": "lendingAccountSettleEmissions",
      "discriminator": [
        161,
        58,
        136,
        174,
        242,
        223,
        156,
        176
      ],
      "accounts": [
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "bank",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "lendingAccountStartFlashloan",
      "discriminator": [
        14,
        131,
        33,
        220,
        81,
        186,
        180,
        107
      ],
      "accounts": [
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "ixsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "endIndex",
          "type": "u64"
        }
      ]
    },
    {
      "name": "lendingAccountWithdraw",
      "discriminator": [
        36,
        72,
        74,
        19,
        210,
        210,
        192,
        192
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "bank",
          "writable": true
        },
        {
          "name": "destinationTokenAccount",
          "writable": true
        },
        {
          "name": "bankLiquidityVaultAuthority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "bankLiquidityVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "withdrawAll",
          "type": {
            "option": "bool"
          }
        }
      ]
    },
    {
      "name": "lendingAccountWithdrawEmissions",
      "discriminator": [
        234,
        22,
        84,
        214,
        118,
        176,
        140,
        170
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "bank",
          "writable": true
        },
        {
          "name": "emissionsMint"
        },
        {
          "name": "emissionsAuth",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  115,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              },
              {
                "kind": "account",
                "path": "emissionsMint"
              }
            ]
          }
        },
        {
          "name": "emissionsVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  115,
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
                  115,
                  101,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              },
              {
                "kind": "account",
                "path": "emissionsMint"
              }
            ]
          }
        },
        {
          "name": "destinationAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "lendingPoolAccrueBankInterest",
      "discriminator": [
        108,
        201,
        30,
        87,
        47,
        65,
        97,
        188
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "bank",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "lendingPoolAddBank",
      "discriminator": [
        215,
        68,
        72,
        78,
        208,
        218,
        103,
        182
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bankMint"
        },
        {
          "name": "bank",
          "writable": true,
          "signer": true
        },
        {
          "name": "liquidityVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "liquidityVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "insuranceVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "insuranceVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "feeVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "feeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
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
          "name": "bankConfig",
          "type": {
            "defined": {
              "name": "bankConfigCompact"
            }
          }
        }
      ]
    },
    {
      "name": "lendingPoolAddBankWithSeed",
      "docs": [
        "A copy of lending_pool_add_bank with an additional bank seed.",
        "This seed is used to create a PDA for the bank's signature.",
        "lending_pool_add_bank is preserved for backwards compatibility."
      ],
      "discriminator": [
        76,
        211,
        213,
        171,
        117,
        78,
        158,
        76
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bankMint"
        },
        {
          "name": "bank",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "marginfiGroup"
              },
              {
                "kind": "account",
                "path": "bankMint"
              },
              {
                "kind": "arg",
                "path": "bankSeed"
              }
            ]
          }
        },
        {
          "name": "liquidityVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "liquidityVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "insuranceVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "insuranceVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "feeVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "feeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
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
          "name": "bankConfig",
          "type": {
            "defined": {
              "name": "bankConfigCompact"
            }
          }
        },
        {
          "name": "bankSeed",
          "type": "u64"
        }
      ]
    },
    {
      "name": "lendingPoolCollectBankFees",
      "discriminator": [
        201,
        5,
        215,
        116,
        230,
        92,
        75,
        150
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "bank",
          "writable": true
        },
        {
          "name": "liquidityVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "liquidityVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "insuranceVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "feeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "lendingPoolConfigureBank",
      "discriminator": [
        121,
        173,
        156,
        40,
        93,
        148,
        56,
        237
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "bank",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "bankConfigOpt",
          "type": {
            "defined": {
              "name": "bankConfigOpt"
            }
          }
        }
      ]
    },
    {
      "name": "lendingPoolHandleBankruptcy",
      "docs": [
        "Handle bad debt of a bankrupt marginfi account for a given bank."
      ],
      "discriminator": [
        162,
        11,
        56,
        139,
        90,
        128,
        70,
        173
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "bank",
          "writable": true
        },
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "liquidityVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "insuranceVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "insuranceVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "lendingPoolSetupEmissions",
      "discriminator": [
        206,
        97,
        120,
        172,
        113,
        204,
        169,
        70
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "bank",
          "writable": true
        },
        {
          "name": "emissionsMint"
        },
        {
          "name": "emissionsAuth",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  115,
                  95,
                  97,
                  117,
                  116,
                  104,
                  95,
                  115,
                  101,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              },
              {
                "kind": "account",
                "path": "emissionsMint"
              }
            ]
          }
        },
        {
          "name": "emissionsTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  115,
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
                  115,
                  101,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              },
              {
                "kind": "account",
                "path": "emissionsMint"
              }
            ]
          }
        },
        {
          "name": "emissionsFundingAccount",
          "writable": true
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
          "name": "flags",
          "type": "u64"
        },
        {
          "name": "rate",
          "type": "u64"
        },
        {
          "name": "totalEmissions",
          "type": "u64"
        }
      ]
    },
    {
      "name": "lendingPoolUpdateEmissionsParameters",
      "discriminator": [
        55,
        213,
        224,
        168,
        153,
        53,
        197,
        40
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "bank",
          "writable": true
        },
        {
          "name": "emissionsMint"
        },
        {
          "name": "emissionsTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  115,
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
                  115,
                  101,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              },
              {
                "kind": "account",
                "path": "emissionsMint"
              }
            ]
          }
        },
        {
          "name": "emissionsFundingAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "emissionsFlags",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "emissionsRate",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "additionalEmissions",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "lendingPoolWithdrawFees",
      "discriminator": [
        92,
        140,
        215,
        254,
        170,
        0,
        83,
        174
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "bank"
        },
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "feeVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "feeVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "dstTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
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
      "name": "lendingPoolWithdrawInsurance",
      "discriminator": [
        108,
        60,
        60,
        246,
        104,
        79,
        159,
        243
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "bank"
        },
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "insuranceVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "insuranceVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  117,
                  114,
                  97,
                  110,
                  99,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
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
                "path": "bank"
              }
            ]
          }
        },
        {
          "name": "dstTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
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
      "name": "marginfiAccountClose",
      "discriminator": [
        186,
        221,
        93,
        34,
        50,
        97,
        194,
        241
      ],
      "accounts": [
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "marginfiAccountInitialize",
      "docs": [
        "Initialize a marginfi account for a given group"
      ],
      "discriminator": [
        43,
        78,
        61,
        255,
        148,
        52,
        249,
        154
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "marginfiAccount",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "marginfiGroupConfigure",
      "discriminator": [
        62,
        199,
        81,
        78,
        33,
        13,
        236,
        61
      ],
      "accounts": [
        {
          "name": "marginfiGroup",
          "writable": true
        },
        {
          "name": "admin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": {
              "name": "groupConfig"
            }
          }
        }
      ]
    },
    {
      "name": "marginfiGroupInitialize",
      "discriminator": [
        255,
        67,
        67,
        26,
        94,
        31,
        34,
        20
      ],
      "accounts": [
        {
          "name": "marginfiGroup",
          "writable": true,
          "signer": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "setAccountFlag",
      "discriminator": [
        56,
        238,
        18,
        207,
        193,
        82,
        138,
        174
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "admin",
          "docs": [
            "Admin only"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "flag",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setNewAccountAuthority",
      "discriminator": [
        153,
        162,
        50,
        84,
        182,
        201,
        74,
        179
      ],
      "accounts": [
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "marginfiGroup"
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "newAuthority"
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "unsetAccountFlag",
      "discriminator": [
        56,
        81,
        56,
        85,
        92,
        49,
        255,
        70
      ],
      "accounts": [
        {
          "name": "marginfiGroup"
        },
        {
          "name": "marginfiAccount",
          "writable": true
        },
        {
          "name": "admin",
          "docs": [
            "Admin only"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "flag",
          "type": "u64"
        }
      ]
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
      "name": "marginfiAccount",
      "discriminator": [
        67,
        178,
        130,
        109,
        126,
        114,
        28,
        42
      ]
    },
    {
      "name": "marginfiGroup",
      "discriminator": [
        182,
        23,
        173,
        240,
        151,
        206,
        182,
        67
      ]
    }
  ],
  "events": [
    {
      "name": "lendingAccountBorrowEvent",
      "discriminator": [
        223,
        96,
        81,
        10,
        156,
        99,
        26,
        59
      ]
    },
    {
      "name": "lendingAccountDepositEvent",
      "discriminator": [
        161,
        54,
        237,
        217,
        105,
        248,
        122,
        151
      ]
    },
    {
      "name": "lendingAccountLiquidateEvent",
      "discriminator": [
        166,
        160,
        249,
        154,
        183,
        39,
        23,
        242
      ]
    },
    {
      "name": "lendingAccountRepayEvent",
      "discriminator": [
        16,
        220,
        55,
        111,
        7,
        80,
        16,
        25
      ]
    },
    {
      "name": "lendingAccountWithdrawEvent",
      "discriminator": [
        3,
        220,
        148,
        243,
        33,
        249,
        54,
        88
      ]
    },
    {
      "name": "lendingPoolBankAccrueInterestEvent",
      "discriminator": [
        104,
        117,
        187,
        156,
        111,
        154,
        106,
        186
      ]
    },
    {
      "name": "lendingPoolBankCollectFeesEvent",
      "discriminator": [
        101,
        119,
        97,
        250,
        169,
        175,
        156,
        253
      ]
    },
    {
      "name": "lendingPoolBankConfigureEvent",
      "discriminator": [
        246,
        35,
        233,
        110,
        93,
        152,
        235,
        40
      ]
    },
    {
      "name": "lendingPoolBankCreateEvent",
      "discriminator": [
        236,
        220,
        201,
        63,
        239,
        126,
        136,
        249
      ]
    },
    {
      "name": "lendingPoolBankHandleBankruptcyEvent",
      "discriminator": [
        166,
        77,
        41,
        140,
        36,
        94,
        10,
        57
      ]
    },
    {
      "name": "marginfiAccountCreateEvent",
      "discriminator": [
        183,
        5,
        117,
        104,
        122,
        199,
        68,
        51
      ]
    },
    {
      "name": "marginfiAccountTransferAccountAuthorityEvent",
      "discriminator": [
        112,
        61,
        140,
        132,
        251,
        92,
        90,
        202
      ]
    },
    {
      "name": "marginfiGroupConfigureEvent",
      "discriminator": [
        241,
        104,
        172,
        167,
        41,
        195,
        199,
        170
      ]
    },
    {
      "name": "marginfiGroupCreateEvent",
      "discriminator": [
        233,
        125,
        61,
        14,
        98,
        240,
        136,
        253
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "mathError",
      "msg": "Math error"
    },
    {
      "code": 6001,
      "name": "bankNotFound",
      "msg": "Invalid bank index"
    },
    {
      "code": 6002,
      "name": "lendingAccountBalanceNotFound",
      "msg": "Lending account balance not found"
    },
    {
      "code": 6003,
      "name": "bankAssetCapacityExceeded",
      "msg": "Bank deposit capacity exceeded"
    },
    {
      "code": 6004,
      "name": "invalidTransfer",
      "msg": "Invalid transfer"
    },
    {
      "code": 6005,
      "name": "missingPythOrBankAccount",
      "msg": "Missing Pyth or Bank account"
    },
    {
      "code": 6006,
      "name": "missingPythAccount",
      "msg": "Missing Pyth account"
    },
    {
      "code": 6007,
      "name": "invalidOracleAccount",
      "msg": "Invalid Pyth account"
    },
    {
      "code": 6008,
      "name": "missingBankAccount",
      "msg": "Missing Bank account"
    },
    {
      "code": 6009,
      "name": "invalidBankAccount",
      "msg": "Invalid Bank account"
    },
    {
      "code": 6010,
      "name": "riskEngineInitRejected",
      "msg": "RiskEngine rejected due to either bad health or stale oracles"
    },
    {
      "code": 6011,
      "name": "lendingAccountBalanceSlotsFull",
      "msg": "Lending account balance slots are full"
    },
    {
      "code": 6012,
      "name": "bankAlreadyExists",
      "msg": "Bank already exists"
    },
    {
      "code": 6013,
      "name": "illegalLiquidation",
      "msg": "Illegal liquidation"
    },
    {
      "code": 6014,
      "name": "accountNotBankrupt",
      "msg": "Account is not bankrupt"
    },
    {
      "code": 6015,
      "name": "balanceNotBadDebt",
      "msg": "Account balance is not bad debt"
    },
    {
      "code": 6016,
      "name": "invalidConfig",
      "msg": "Invalid group config"
    },
    {
      "code": 6017,
      "name": "staleOracle",
      "msg": "Stale oracle data"
    },
    {
      "code": 6018,
      "name": "bankPaused",
      "msg": "Bank paused"
    },
    {
      "code": 6019,
      "name": "bankReduceOnly",
      "msg": "Bank is ReduceOnly mode"
    },
    {
      "code": 6020,
      "name": "bankAccountNotFound",
      "msg": "Bank is missing"
    },
    {
      "code": 6021,
      "name": "operationDepositOnly",
      "msg": "Operation is deposit-only"
    },
    {
      "code": 6022,
      "name": "operationWithdrawOnly",
      "msg": "Operation is withdraw-only"
    },
    {
      "code": 6023,
      "name": "operationBorrowOnly",
      "msg": "Operation is borrow-only"
    },
    {
      "code": 6024,
      "name": "operationRepayOnly",
      "msg": "Operation is repay-only"
    },
    {
      "code": 6025,
      "name": "noAssetFound",
      "msg": "No asset found"
    },
    {
      "code": 6026,
      "name": "noLiabilityFound",
      "msg": "No liability found"
    },
    {
      "code": 6027,
      "name": "invalidOracleSetup",
      "msg": "Invalid oracle setup"
    },
    {
      "code": 6028,
      "name": "illegalUtilizationRatio",
      "msg": "Invalid bank utilization ratio"
    },
    {
      "code": 6029,
      "name": "bankLiabilityCapacityExceeded",
      "msg": "Bank borrow cap exceeded"
    },
    {
      "code": 6030,
      "name": "invalidPrice",
      "msg": "Invalid Price"
    },
    {
      "code": 6031,
      "name": "isolatedAccountIllegalState",
      "msg": "Account can have only one liability when account is under isolated risk"
    },
    {
      "code": 6032,
      "name": "emissionsAlreadySetup",
      "msg": "Emissions already setup"
    },
    {
      "code": 6033,
      "name": "oracleNotSetup",
      "msg": "Oracle is not set"
    },
    {
      "code": 6034,
      "name": "invalidSwitchboardDecimalConversion",
      "msg": "Invalid switchboard decimal conversion"
    },
    {
      "code": 6035,
      "name": "cannotCloseOutstandingEmissions",
      "msg": "Cannot close balance because of outstanding emissions"
    },
    {
      "code": 6036,
      "name": "emissionsUpdateError",
      "msg": "Update emissions error"
    },
    {
      "code": 6037,
      "name": "accountDisabled",
      "msg": "Account disabled"
    },
    {
      "code": 6038,
      "name": "accountTempActiveBalanceLimitExceeded",
      "msg": "Account can't temporarily open 3 balances, please close a balance first"
    },
    {
      "code": 6039,
      "name": "accountInFlashloan",
      "msg": "Illegal action during flashloan"
    },
    {
      "code": 6040,
      "name": "illegalFlashloan",
      "msg": "Illegal flashloan"
    },
    {
      "code": 6041,
      "name": "illegalFlag",
      "msg": "Illegal flag"
    },
    {
      "code": 6042,
      "name": "illegalBalanceState",
      "msg": "Illegal balance state"
    },
    {
      "code": 6043,
      "name": "illegalAccountAuthorityTransfer",
      "msg": "Illegal account authority transfer"
    },
    {
      "code": 6044,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6045,
      "name": "illegalAction",
      "msg": "Invalid account authority"
    },
    {
      "code": 6046,
      "name": "t22MintRequired",
      "msg": "Token22 Banks require mint account as first remaining account"
    }
  ],
  "types": [
    {
      "name": "accountEventHeader",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "signer",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "marginfiAccount",
            "type": "pubkey"
          },
          {
            "name": "marginfiAccountAuthority",
            "type": "pubkey"
          },
          {
            "name": "marginfiGroup",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "balance",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "bankPk",
            "type": "pubkey"
          },
          {
            "name": "pad0",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "assetShares",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "liabilityShares",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "emissionsOutstanding",
            "type": {
              "defined": {
                "name": "wrappedI80f48"
              }
            }
          },
          {
            "name": "lastUpdate",
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                1
              ]
            }
          }
        ]
      }
    },
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
            "name": "pad0",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
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
            "name": "pad1",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
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
            "name": "pad2",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
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
            "name": "pad0",
            "type": {
              "array": [
                "u8",
                6
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
            "name": "pad1",
            "type": {
              "array": [
                "u8",
                7
              ]
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
                "u8",
                38
              ]
            }
          }
        ]
      }
    },
    {
      "name": "bankConfigCompact",
      "docs": [
        "TODO: Convert weights to (u64, u64) to avoid precision loss (maybe?)"
      ],
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
                "name": "interestRateConfigCompact"
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
            "name": "oracleKey",
            "type": "pubkey"
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
            "name": "pad0",
            "type": {
              "array": [
                "u8",
                7
              ]
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
          }
        ]
      }
    },
    {
      "name": "bankConfigOpt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetWeightInit",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          },
          {
            "name": "assetWeightMaint",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          },
          {
            "name": "liabilityWeightInit",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          },
          {
            "name": "liabilityWeightMaint",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          },
          {
            "name": "depositLimit",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "borrowLimit",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "operationalState",
            "type": {
              "option": {
                "defined": {
                  "name": "bankOperationalState"
                }
              }
            }
          },
          {
            "name": "oracle",
            "type": {
              "option": {
                "defined": {
                  "name": "oracleConfig"
                }
              }
            }
          },
          {
            "name": "interestRateConfig",
            "type": {
              "option": {
                "defined": {
                  "name": "interestRateConfigOpt"
                }
              }
            }
          },
          {
            "name": "riskTier",
            "type": {
              "option": {
                "defined": {
                  "name": "riskTier"
                }
              }
            }
          },
          {
            "name": "totalAssetValueInitLimit",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "oracleMaxAge",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "permissionlessBadDebtSettlement",
            "type": {
              "option": "bool"
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
      "name": "groupConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "groupEventHeader",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "signer",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "marginfiGroup",
            "type": "pubkey"
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
      "name": "interestRateConfigCompact",
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
          }
        ]
      }
    },
    {
      "name": "interestRateConfigOpt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optimalUtilizationRate",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          },
          {
            "name": "plateauInterestRate",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          },
          {
            "name": "maxInterestRate",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          },
          {
            "name": "insuranceFeeFixedApr",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          },
          {
            "name": "insuranceIrFee",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          },
          {
            "name": "protocolFixedFeeApr",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          },
          {
            "name": "protocolIrFee",
            "type": {
              "option": {
                "defined": {
                  "name": "wrappedI80f48"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "lendingAccount",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "balances",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "balance"
                  }
                },
                16
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "lendingAccountBorrowEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "accountEventHeader"
              }
            }
          },
          {
            "name": "bank",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "lendingAccountDepositEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "accountEventHeader"
              }
            }
          },
          {
            "name": "bank",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "lendingAccountLiquidateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "accountEventHeader"
              }
            }
          },
          {
            "name": "liquidateeMarginfiAccount",
            "type": "pubkey"
          },
          {
            "name": "liquidateeMarginfiAccountAuthority",
            "type": "pubkey"
          },
          {
            "name": "assetBank",
            "type": "pubkey"
          },
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "liabilityBank",
            "type": "pubkey"
          },
          {
            "name": "liabilityMint",
            "type": "pubkey"
          },
          {
            "name": "liquidateePreHealth",
            "type": "f64"
          },
          {
            "name": "liquidateePostHealth",
            "type": "f64"
          },
          {
            "name": "preBalances",
            "type": {
              "defined": {
                "name": "liquidationBalances"
              }
            }
          },
          {
            "name": "postBalances",
            "type": {
              "defined": {
                "name": "liquidationBalances"
              }
            }
          }
        ]
      }
    },
    {
      "name": "lendingAccountRepayEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "accountEventHeader"
              }
            }
          },
          {
            "name": "bank",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "closeBalance",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "lendingAccountWithdrawEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "accountEventHeader"
              }
            }
          },
          {
            "name": "bank",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "closeBalance",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "lendingPoolBankAccrueInterestEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "groupEventHeader"
              }
            }
          },
          {
            "name": "bank",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "delta",
            "type": "u64"
          },
          {
            "name": "feesCollected",
            "type": "f64"
          },
          {
            "name": "insuranceCollected",
            "type": "f64"
          }
        ]
      }
    },
    {
      "name": "lendingPoolBankCollectFeesEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "groupEventHeader"
              }
            }
          },
          {
            "name": "bank",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "groupFeesCollected",
            "type": "f64"
          },
          {
            "name": "groupFeesOutstanding",
            "type": "f64"
          },
          {
            "name": "insuranceFeesCollected",
            "type": "f64"
          },
          {
            "name": "insuranceFeesOutstanding",
            "type": "f64"
          }
        ]
      }
    },
    {
      "name": "lendingPoolBankConfigureEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "groupEventHeader"
              }
            }
          },
          {
            "name": "bank",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "config",
            "type": {
              "defined": {
                "name": "bankConfigOpt"
              }
            }
          }
        ]
      }
    },
    {
      "name": "lendingPoolBankCreateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "groupEventHeader"
              }
            }
          },
          {
            "name": "bank",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "lendingPoolBankHandleBankruptcyEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "accountEventHeader"
              }
            }
          },
          {
            "name": "bank",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "badDebt",
            "type": "f64"
          },
          {
            "name": "coveredAmount",
            "type": "f64"
          },
          {
            "name": "socializedAmount",
            "type": "f64"
          }
        ]
      }
    },
    {
      "name": "liquidationBalances",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "liquidateeAssetBalance",
            "type": "f64"
          },
          {
            "name": "liquidateeLiabilityBalance",
            "type": "f64"
          },
          {
            "name": "liquidatorAssetBalance",
            "type": "f64"
          },
          {
            "name": "liquidatorLiabilityBalance",
            "type": "f64"
          }
        ]
      }
    },
    {
      "name": "marginfiAccount",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "group",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "lendingAccount",
            "type": {
              "defined": {
                "name": "lendingAccount"
              }
            }
          },
          {
            "name": "accountFlags",
            "docs": [
              "The flags that indicate the state of the account.",
              "This is u64 bitfield, where each bit represents a flag.",
              "",
              "Flags:",
              "- DISABLED_FLAG = 1 << 0 = 1 - This flag indicates that the account is disabled,",
              "and no further actions can be taken on it."
            ],
            "type": "u64"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                63
              ]
            }
          }
        ]
      }
    },
    {
      "name": "marginfiAccountCreateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "accountEventHeader"
              }
            }
          }
        ]
      }
    },
    {
      "name": "marginfiAccountTransferAccountAuthorityEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "accountEventHeader"
              }
            }
          },
          {
            "name": "oldAccountAuthority",
            "type": "pubkey"
          },
          {
            "name": "newAccountAuthority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "marginfiGroup",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
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
                32
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
      "name": "marginfiGroupConfigureEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "groupEventHeader"
              }
            }
          },
          {
            "name": "config",
            "type": {
              "defined": {
                "name": "groupConfig"
              }
            }
          }
        ]
      }
    },
    {
      "name": "marginfiGroupCreateEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "header",
            "type": {
              "defined": {
                "name": "groupEventHeader"
              }
            }
          }
        ]
      }
    },
    {
      "name": "oracleConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "setup",
            "type": {
              "defined": {
                "name": "oracleSetup"
              }
            }
          },
          {
            "name": "keys",
            "type": {
              "array": [
                "pubkey",
                5
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
            "name": "pythLegacy"
          },
          {
            "name": "switchboardV2"
          },
          {
            "name": "pythPushOracle"
          },
          {
            "name": "switchboardPull"
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
  ]
};
