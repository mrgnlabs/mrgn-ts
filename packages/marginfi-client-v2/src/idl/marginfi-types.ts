/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/marginfi.json`.
 */
export type Marginfi = {
  address: "";
  metadata: {
    name: "marginfi";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "configGroupFee";
      docs: [
        "(global fee admin only) Enable or disable program fees for any group. Does not require the",
        "group admin to sign: the global fee state admin can turn program fees on or off for any",
        "group"
      ];
      discriminator: [231, 205, 66, 242, 220, 87, 145, 38];
      accounts: [
        {
          name: "marginfiGroup";
          writable: true;
        },
        {
          name: "globalFeeAdmin";
          docs: ["`global_fee_admin` of the FeeState"];
          signer: true;
          relations: ["feeState"];
        },
        {
          name: "feeState";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 115, 116, 97, 116, 101];
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "flag";
          type: "u64";
        }
      ];
    },
    {
      name: "editGlobalFeeState";
      docs: ["(global fee admin only) Adjust fees or the destination wallet"];
      discriminator: [52, 62, 35, 129, 93, 69, 165, 202];
      accounts: [
        {
          name: "globalFeeAdmin";
          docs: ["Admin of the global FeeState"];
          writable: true;
          signer: true;
          relations: ["feeState"];
        },
        {
          name: "feeState";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 115, 116, 97, 116, 101];
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "feeWallet";
          type: "pubkey";
        },
        {
          name: "bankInitFlatSolFee";
          type: "u32";
        },
        {
          name: "programFeeFixed";
          type: {
            defined: {
              name: "wrappedI80f48";
            };
          };
        },
        {
          name: "programFeeRate";
          type: {
            defined: {
              name: "wrappedI80f48";
            };
          };
        }
      ];
    },
    {
      name: "editStakedSettings";
      discriminator: [11, 108, 215, 87, 240, 9, 66, 241];
      accounts: [
        {
          name: "marginfiGroup";
          relations: ["stakedSettings"];
        },
        {
          name: "admin";
          signer: true;
          relations: ["marginfiGroup"];
        },
        {
          name: "stakedSettings";
          writable: true;
        }
      ];
      args: [
        {
          name: "settings";
          type: {
            defined: {
              name: "stakedSettingsEditConfig";
            };
          };
        }
      ];
    },
    {
      name: "initGlobalFeeState";
      docs: [
        "(Runs once per program) Configures the fee state account, where the global admin sets fees",
        "that are assessed to the protocol"
      ];
      discriminator: [82, 48, 247, 59, 220, 109, 231, 44];
      accounts: [
        {
          name: "payer";
          docs: ["Pays the init fee"];
          writable: true;
          signer: true;
        },
        {
          name: "feeState";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 115, 116, 97, 116, 101];
              }
            ];
          };
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "admin";
          type: "pubkey";
        },
        {
          name: "feeWallet";
          type: "pubkey";
        },
        {
          name: "bankInitFlatSolFee";
          type: "u32";
        },
        {
          name: "programFeeFixed";
          type: {
            defined: {
              name: "wrappedI80f48";
            };
          };
        },
        {
          name: "programFeeRate";
          type: {
            defined: {
              name: "wrappedI80f48";
            };
          };
        }
      ];
    },
    {
      name: "initStakedSettings";
      docs: [
        "(group admin only) Init the Staked Settings account, which is used to create staked",
        "collateral banks, and must run before any staked collateral bank can be created with",
        "`add_pool_permissionless`. Running this ix effectively opts the group into the staked",
        "collateral feature."
      ];
      discriminator: [52, 35, 149, 44, 69, 86, 69, 80];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "admin";
          signer: true;
          relations: ["marginfiGroup"];
        },
        {
          name: "feePayer";
          docs: ["Pays the init fee"];
          writable: true;
          signer: true;
        },
        {
          name: "stakedSettings";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [115, 116, 97, 107, 101, 100, 95, 115, 101, 116, 116, 105, 110, 103, 115];
              },
              {
                kind: "account";
                path: "marginfiGroup";
              }
            ];
          };
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "settings";
          type: {
            defined: {
              name: "stakedSettingsConfig";
            };
          };
        }
      ];
    },
    {
      name: "lendingAccountBorrow";
      discriminator: [4, 126, 116, 53, 48, 5, 212, 31];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "signer";
          signer: true;
        },
        {
          name: "bank";
          writable: true;
        },
        {
          name: "destinationTokenAccount";
          writable: true;
        },
        {
          name: "bankLiquidityVaultAuthority";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "bankLiquidityVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "tokenProgram";
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
      name: "lendingAccountCloseBalance";
      discriminator: [245, 54, 41, 4, 243, 202, 31, 17];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "signer";
          signer: true;
        },
        {
          name: "bank";
          writable: true;
        }
      ];
      args: [];
    },
    {
      name: "lendingAccountDeposit";
      discriminator: [171, 94, 235, 103, 82, 64, 212, 140];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "signer";
          signer: true;
        },
        {
          name: "bank";
          writable: true;
        },
        {
          name: "signerTokenAccount";
          writable: true;
        },
        {
          name: "bankLiquidityVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "tokenProgram";
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
      name: "lendingAccountEndFlashloan";
      discriminator: [105, 124, 201, 106, 153, 2, 8, 156];
      accounts: [
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "signer";
          signer: true;
        }
      ];
      args: [];
    },
    {
      name: "lendingAccountLiquidate";
      docs: ["Liquidate a lending account balance of an unhealthy marginfi account"];
      discriminator: [214, 169, 151, 213, 251, 167, 86, 219];
      accounts: [
        {
          name: "group";
          relations: ["assetBank", "liabBank", "liquidatorMarginfiAccount", "liquidateeMarginfiAccount"];
        },
        {
          name: "assetBank";
          writable: true;
        },
        {
          name: "liabBank";
          writable: true;
        },
        {
          name: "liquidatorMarginfiAccount";
          writable: true;
        },
        {
          name: "signer";
          signer: true;
        },
        {
          name: "liquidateeMarginfiAccount";
          writable: true;
        },
        {
          name: "bankLiquidityVaultAuthority";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "liabBank";
              }
            ];
          };
        },
        {
          name: "bankLiquidityVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "liabBank";
              }
            ];
          };
        },
        {
          name: "bankInsuranceVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "liabBank";
              }
            ];
          };
        },
        {
          name: "tokenProgram";
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
      name: "lendingAccountRepay";
      discriminator: [79, 209, 172, 177, 222, 51, 173, 151];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "signer";
          signer: true;
        },
        {
          name: "bank";
          writable: true;
        },
        {
          name: "signerTokenAccount";
          writable: true;
        },
        {
          name: "bankLiquidityVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        },
        {
          name: "repayAll";
          type: {
            option: "bool";
          };
        }
      ];
    },
    {
      name: "lendingAccountSettleEmissions";
      discriminator: [161, 58, 136, 174, 242, 223, 156, 176];
      accounts: [
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "bank";
          writable: true;
        }
      ];
      args: [];
    },
    {
      name: "lendingAccountStartFlashloan";
      discriminator: [14, 131, 33, 220, 81, 186, 180, 107];
      accounts: [
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "signer";
          signer: true;
        },
        {
          name: "ixsSysvar";
          address: "Sysvar1nstructions1111111111111111111111111";
        }
      ];
      args: [
        {
          name: "endIndex";
          type: "u64";
        }
      ];
    },
    {
      name: "lendingAccountWithdraw";
      discriminator: [36, 72, 74, 19, 210, 210, 192, 192];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "signer";
          signer: true;
        },
        {
          name: "bank";
          writable: true;
        },
        {
          name: "destinationTokenAccount";
          writable: true;
        },
        {
          name: "bankLiquidityVaultAuthority";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "bankLiquidityVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        },
        {
          name: "withdrawAll";
          type: {
            option: "bool";
          };
        }
      ];
    },
    {
      name: "lendingAccountWithdrawEmissions";
      discriminator: [234, 22, 84, 214, 118, 176, 140, 170];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "signer";
          signer: true;
        },
        {
          name: "bank";
          writable: true;
        },
        {
          name: "emissionsMint";
        },
        {
          name: "emissionsAuth";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [101, 109, 105, 115, 115, 105, 111, 110, 115, 95, 97, 117, 116, 104, 95, 115, 101, 101, 100];
              },
              {
                kind: "account";
                path: "bank";
              },
              {
                kind: "account";
                path: "emissionsMint";
              }
            ];
          };
        },
        {
          name: "emissionsVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
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
                ];
              },
              {
                kind: "account";
                path: "bank";
              },
              {
                kind: "account";
                path: "emissionsMint";
              }
            ];
          };
        },
        {
          name: "destinationAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [];
    },
    {
      name: "lendingPoolAccrueBankInterest";
      discriminator: [108, 201, 30, 87, 47, 65, 97, 188];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "bank";
          writable: true;
        }
      ];
      args: [];
    },
    {
      name: "lendingPoolAddBank";
      discriminator: [215, 68, 72, 78, 208, 218, 103, 182];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "feePayer";
          docs: ["Pays to init accounts and pays `fee_state.bank_init_flat_sol_fee` lamports to the protocol"];
          writable: true;
          signer: true;
        },
        {
          name: "feeState";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 115, 116, 97, 116, 101];
              }
            ];
          };
        },
        {
          name: "globalFeeWallet";
          writable: true;
          relations: ["feeState"];
        },
        {
          name: "bankMint";
        },
        {
          name: "bank";
          writable: true;
          signer: true;
        },
        {
          name: "liquidityVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "liquidityVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "insuranceVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "insuranceVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "feeVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "feeVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "bankConfig";
          type: {
            defined: {
              name: "bankConfigCompact";
            };
          };
        }
      ];
    },
    {
      name: "lendingPoolAddBankPermissionless";
      discriminator: [127, 187, 121, 34, 187, 167, 238, 102];
      accounts: [
        {
          name: "marginfiGroup";
          relations: ["stakedSettings"];
        },
        {
          name: "stakedSettings";
        },
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "bankMint";
          docs: [
            "Mint of the spl-single-pool LST (a PDA derived from `stake_pool`)",
            "",
            "because the sol_pool and stake_pool will not derive to a valid PDA which is also owned by",
            "the staking program and spl-single-pool program."
          ];
        },
        {
          name: "solPool";
        },
        {
          name: "stakePool";
          docs: [
            "this key.",
            "",
            "If derives the same `bank_mint`, then this must be the correct stake pool for that mint, and",
            "we can subsequently use it to validate the `sol_pool`"
          ];
        },
        {
          name: "bank";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "marginfiGroup";
              },
              {
                kind: "account";
                path: "bankMint";
              },
              {
                kind: "arg";
                path: "bankSeed";
              }
            ];
          };
        },
        {
          name: "liquidityVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "liquidityVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "insuranceVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "insuranceVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "feeVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "feeVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "bankSeed";
          type: "u64";
        }
      ];
    },
    {
      name: "lendingPoolAddBankWithSeed";
      docs: [
        "A copy of lending_pool_add_bank with an additional bank seed.",
        "This seed is used to create a PDA for the bank's signature.",
        "lending_pool_add_bank is preserved for backwards compatibility."
      ];
      discriminator: [76, 211, 213, 171, 117, 78, 158, 76];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "feePayer";
          docs: ["Pays to init accounts and pays `fee_state.bank_init_flat_sol_fee` lamports to the protocol"];
          writable: true;
          signer: true;
        },
        {
          name: "feeState";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 115, 116, 97, 116, 101];
              }
            ];
          };
        },
        {
          name: "globalFeeWallet";
          writable: true;
          relations: ["feeState"];
        },
        {
          name: "bankMint";
        },
        {
          name: "bank";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "marginfiGroup";
              },
              {
                kind: "account";
                path: "bankMint";
              },
              {
                kind: "arg";
                path: "bankSeed";
              }
            ];
          };
        },
        {
          name: "liquidityVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "liquidityVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "insuranceVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "insuranceVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "feeVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "feeVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "bankConfig";
          type: {
            defined: {
              name: "bankConfigCompact";
            };
          };
        },
        {
          name: "bankSeed";
          type: "u64";
        }
      ];
    },
    {
      name: "lendingPoolCollectBankFees";
      discriminator: [201, 5, 215, 116, 230, 92, 75, 150];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "bank";
          writable: true;
        },
        {
          name: "liquidityVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "liquidityVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "insuranceVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "feeVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "feeState";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 115, 116, 97, 116, 101];
              }
            ];
          };
        },
        {
          name: "feeAta";
          docs: [
            "(validated in handler). Must already exist, may require initializing the ATA if it does not",
            "already exist prior to this ix."
          ];
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [];
    },
    {
      name: "lendingPoolConfigureBank";
      discriminator: [121, 173, 156, 40, 93, 148, 56, 237];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "admin";
          signer: true;
        },
        {
          name: "bank";
          writable: true;
        }
      ];
      args: [
        {
          name: "bankConfigOpt";
          type: {
            defined: {
              name: "bankConfigOpt";
            };
          };
        }
      ];
    },
    {
      name: "lendingPoolConfigureBankOracle";
      discriminator: [209, 82, 255, 171, 124, 21, 71, 81];
      accounts: [
        {
          name: "group";
          relations: ["bank"];
        },
        {
          name: "admin";
          signer: true;
          relations: ["group"];
        },
        {
          name: "bank";
          writable: true;
        }
      ];
      args: [
        {
          name: "setup";
          type: "u8";
        },
        {
          name: "oracle";
          type: "pubkey";
        }
      ];
    },
    {
      name: "lendingPoolHandleBankruptcy";
      docs: ["Handle bad debt of a bankrupt marginfi account for a given bank."];
      discriminator: [162, 11, 56, 139, 90, 128, 70, 173];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "signer";
          signer: true;
        },
        {
          name: "bank";
          writable: true;
        },
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "liquidityVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 113, 117, 105, 100, 105, 116, 121, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "insuranceVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "insuranceVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [];
    },
    {
      name: "lendingPoolSetupEmissions";
      discriminator: [206, 97, 120, 172, 113, 204, 169, 70];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "bank";
          writable: true;
        },
        {
          name: "emissionsMint";
        },
        {
          name: "emissionsAuth";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [101, 109, 105, 115, 115, 105, 111, 110, 115, 95, 97, 117, 116, 104, 95, 115, 101, 101, 100];
              },
              {
                kind: "account";
                path: "bank";
              },
              {
                kind: "account";
                path: "emissionsMint";
              }
            ];
          };
        },
        {
          name: "emissionsTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
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
                ];
              },
              {
                kind: "account";
                path: "bank";
              },
              {
                kind: "account";
                path: "emissionsMint";
              }
            ];
          };
        },
        {
          name: "emissionsFundingAccount";
          docs: ["NOTE: This is a TokenAccount, spl transfer will validate it.", ""];
          writable: true;
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "flags";
          type: "u64";
        },
        {
          name: "rate";
          type: "u64";
        },
        {
          name: "totalEmissions";
          type: "u64";
        }
      ];
    },
    {
      name: "lendingPoolUpdateEmissionsParameters";
      discriminator: [55, 213, 224, 168, 153, 53, 197, 40];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "bank";
          writable: true;
        },
        {
          name: "emissionsMint";
        },
        {
          name: "emissionsTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
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
                ];
              },
              {
                kind: "account";
                path: "bank";
              },
              {
                kind: "account";
                path: "emissionsMint";
              }
            ];
          };
        },
        {
          name: "emissionsFundingAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "emissionsFlags";
          type: {
            option: "u64";
          };
        },
        {
          name: "emissionsRate";
          type: {
            option: "u64";
          };
        },
        {
          name: "additionalEmissions";
          type: {
            option: "u64";
          };
        }
      ];
    },
    {
      name: "lendingPoolWithdrawFees";
      discriminator: [92, 140, 215, 254, 170, 0, 83, 174];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "bank";
        },
        {
          name: "admin";
          signer: true;
        },
        {
          name: "feeVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "feeVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "dstTokenAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
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
      name: "lendingPoolWithdrawInsurance";
      discriminator: [108, 60, 60, 246, 104, 79, 159, 243];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "bank";
        },
        {
          name: "admin";
          signer: true;
        },
        {
          name: "insuranceVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "insuranceVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [105, 110, 115, 117, 114, 97, 110, 99, 101, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "dstTokenAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
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
      name: "marginfiAccountClose";
      discriminator: [186, 221, 93, 34, 50, 97, 194, 241];
      accounts: [
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "authority";
          signer: true;
        },
        {
          name: "feePayer";
          writable: true;
          signer: true;
        }
      ];
      args: [];
    },
    {
      name: "marginfiAccountInitialize";
      docs: ["Initialize a marginfi account for a given group"];
      discriminator: [43, 78, 61, 255, 148, 52, 249, 154];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "marginfiAccount";
          writable: true;
          signer: true;
        },
        {
          name: "authority";
          signer: true;
        },
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "marginfiGroupConfigure";
      discriminator: [62, 199, 81, 78, 33, 13, 236, 61];
      accounts: [
        {
          name: "marginfiGroup";
          writable: true;
        },
        {
          name: "admin";
          signer: true;
        }
      ];
      args: [
        {
          name: "config";
          type: {
            defined: {
              name: "groupConfig";
            };
          };
        }
      ];
    },
    {
      name: "marginfiGroupInitialize";
      discriminator: [255, 67, 67, 26, 94, 31, 34, 20];
      accounts: [
        {
          name: "marginfiGroup";
          writable: true;
          signer: true;
        },
        {
          name: "admin";
          writable: true;
          signer: true;
        },
        {
          name: "feeState";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 115, 116, 97, 116, 101];
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "propagateFeeState";
      docs: ["(Permissionless) Force any group to adopt the current FeeState settings"];
      discriminator: [64, 3, 166, 194, 129, 21, 101, 155];
      accounts: [
        {
          name: "feeState";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [102, 101, 101, 115, 116, 97, 116, 101];
              }
            ];
          };
        },
        {
          name: "marginfiGroup";
          docs: ["Any group, this ix is permisionless and can propogate the fee to any group"];
          writable: true;
        }
      ];
      args: [];
    },
    {
      name: "propagateStakedSettings";
      discriminator: [210, 30, 152, 69, 130, 99, 222, 170];
      accounts: [
        {
          name: "marginfiGroup";
          relations: ["stakedSettings"];
        },
        {
          name: "stakedSettings";
        },
        {
          name: "bank";
          writable: true;
        }
      ];
      args: [];
    },
    {
      name: "setAccountFlag";
      discriminator: [56, 238, 18, 207, 193, 82, 138, 174];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "admin";
          docs: ["Admin only"];
          signer: true;
        }
      ];
      args: [
        {
          name: "flag";
          type: "u64";
        }
      ];
    },
    {
      name: "setNewAccountAuthority";
      discriminator: [153, 162, 50, 84, 182, 201, 74, 179];
      accounts: [
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "marginfiGroup";
        },
        {
          name: "signer";
          signer: true;
        },
        {
          name: "newAuthority";
        },
        {
          name: "feePayer";
          writable: true;
          signer: true;
        }
      ];
      args: [];
    },
    {
      name: "unsetAccountFlag";
      discriminator: [56, 81, 56, 85, 92, 49, 255, 70];
      accounts: [
        {
          name: "marginfiGroup";
        },
        {
          name: "marginfiAccount";
          writable: true;
        },
        {
          name: "admin";
          docs: ["Admin only"];
          signer: true;
        }
      ];
      args: [
        {
          name: "flag";
          type: "u64";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "bank";
      discriminator: [142, 49, 166, 242, 50, 66, 97, 188];
    },
    {
      name: "feeState";
      discriminator: [63, 224, 16, 85, 193, 36, 235, 220];
    },
    {
      name: "marginfiAccount";
      discriminator: [67, 178, 130, 109, 126, 114, 28, 42];
    },
    {
      name: "marginfiGroup";
      discriminator: [182, 23, 173, 240, 151, 206, 182, 67];
    },
    {
      name: "stakedSettings";
      discriminator: [157, 140, 6, 77, 89, 173, 173, 125];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "mathError";
      msg: "Math error";
    },
    {
      code: 6001;
      name: "bankNotFound";
      msg: "Invalid bank index";
    },
    {
      code: 6002;
      name: "lendingAccountBalanceNotFound";
      msg: "Lending account balance not found";
    },
    {
      code: 6003;
      name: "bankAssetCapacityExceeded";
      msg: "Bank deposit capacity exceeded";
    },
    {
      code: 6004;
      name: "invalidTransfer";
      msg: "Invalid transfer";
    },
    {
      code: 6005;
      name: "missingPythOrBankAccount";
      msg: "Missing Pyth or Bank account";
    },
    {
      code: 6006;
      name: "missingPythAccount";
      msg: "Missing Pyth account";
    },
    {
      code: 6007;
      name: "invalidOracleAccount";
      msg: "Invalid Pyth account";
    },
    {
      code: 6008;
      name: "missingBankAccount";
      msg: "Missing Bank account";
    },
    {
      code: 6009;
      name: "invalidBankAccount";
      msg: "Invalid Bank account";
    },
    {
      code: 6010;
      name: "riskEngineInitRejected";
      msg: "RiskEngine rejected due to either bad health or stale oracles";
    },
    {
      code: 6011;
      name: "lendingAccountBalanceSlotsFull";
      msg: "Lending account balance slots are full";
    },
    {
      code: 6012;
      name: "bankAlreadyExists";
      msg: "Bank already exists";
    },
    {
      code: 6013;
      name: "illegalLiquidation";
      msg: "Illegal liquidation";
    },
    {
      code: 6014;
      name: "accountNotBankrupt";
      msg: "Account is not bankrupt";
    },
    {
      code: 6015;
      name: "balanceNotBadDebt";
      msg: "Account balance is not bad debt";
    },
    {
      code: 6016;
      name: "invalidConfig";
      msg: "Invalid group config";
    },
    {
      code: 6017;
      name: "staleOracle";
      msg: "Stale oracle data";
    },
    {
      code: 6018;
      name: "bankPaused";
      msg: "Bank paused";
    },
    {
      code: 6019;
      name: "bankReduceOnly";
      msg: "Bank is ReduceOnly mode";
    },
    {
      code: 6020;
      name: "bankAccountNotFound";
      msg: "Bank is missing";
    },
    {
      code: 6021;
      name: "operationDepositOnly";
      msg: "Operation is deposit-only";
    },
    {
      code: 6022;
      name: "operationWithdrawOnly";
      msg: "Operation is withdraw-only";
    },
    {
      code: 6023;
      name: "operationBorrowOnly";
      msg: "Operation is borrow-only";
    },
    {
      code: 6024;
      name: "operationRepayOnly";
      msg: "Operation is repay-only";
    },
    {
      code: 6025;
      name: "noAssetFound";
      msg: "No asset found";
    },
    {
      code: 6026;
      name: "noLiabilityFound";
      msg: "No liability found";
    },
    {
      code: 6027;
      name: "invalidOracleSetup";
      msg: "Invalid oracle setup";
    },
    {
      code: 6028;
      name: "illegalUtilizationRatio";
      msg: "Invalid bank utilization ratio";
    },
    {
      code: 6029;
      name: "bankLiabilityCapacityExceeded";
      msg: "Bank borrow cap exceeded";
    },
    {
      code: 6030;
      name: "invalidPrice";
      msg: "Invalid Price";
    },
    {
      code: 6031;
      name: "isolatedAccountIllegalState";
      msg: "Account can have only one liability when account is under isolated risk";
    },
    {
      code: 6032;
      name: "emissionsAlreadySetup";
      msg: "Emissions already setup";
    },
    {
      code: 6033;
      name: "oracleNotSetup";
      msg: "Oracle is not set";
    },
    {
      code: 6034;
      name: "invalidSwitchboardDecimalConversion";
      msg: "Invalid switchboard decimal conversion";
    },
    {
      code: 6035;
      name: "cannotCloseOutstandingEmissions";
      msg: "Cannot close balance because of outstanding emissions";
    },
    {
      code: 6036;
      name: "emissionsUpdateError";
      msg: "Update emissions error";
    },
    {
      code: 6037;
      name: "accountDisabled";
      msg: "Account disabled";
    },
    {
      code: 6038;
      name: "accountTempActiveBalanceLimitExceeded";
      msg: "Account can't temporarily open 3 balances, please close a balance first";
    },
    {
      code: 6039;
      name: "accountInFlashloan";
      msg: "Illegal action during flashloan";
    },
    {
      code: 6040;
      name: "illegalFlashloan";
      msg: "Illegal flashloan";
    },
    {
      code: 6041;
      name: "illegalFlag";
      msg: "Illegal flag";
    },
    {
      code: 6042;
      name: "illegalBalanceState";
      msg: "Illegal balance state";
    },
    {
      code: 6043;
      name: "illegalAccountAuthorityTransfer";
      msg: "Illegal account authority transfer";
    },
    {
      code: 6044;
      name: "unauthorized";
      msg: "unauthorized";
    },
    {
      code: 6045;
      name: "illegalAction";
      msg: "Invalid account authority";
    },
    {
      code: 6046;
      name: "t22MintRequired";
      msg: "Token22 Banks require mint account as first remaining account";
    },
    {
      code: 6047;
      name: "invalidFeeAta";
      msg: "Invalid ATA for global fee account";
    },
    {
      code: 6048;
      name: "addedStakedPoolManually";
      msg: "Use add pool permissionless instead";
    },
    {
      code: 6049;
      name: "assetTagMismatch";
      msg: "Staked SOL accounts can only deposit staked assets and borrow SOL";
    },
    {
      code: 6050;
      name: "stakePoolValidationFailed";
      msg: "Stake pool validation failed: check the stake pool, mint, or sol pool";
    }
  ];
  types: [
    {
      name: "accountEventHeader";
      type: {
        kind: "struct";
        fields: [
          {
            name: "signer";
            type: {
              option: "pubkey";
            };
          },
          {
            name: "marginfiAccount";
            type: "pubkey";
          },
          {
            name: "marginfiAccountAuthority";
            type: "pubkey";
          },
          {
            name: "marginfiGroup";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "balance";
      serialization: "bytemuckunsafe";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "active";
            type: "bool";
          },
          {
            name: "bankPk";
            type: "pubkey";
          },
          {
            name: "bankAssetTag";
            docs: [
              "Inherited from the bank when the position is first created and CANNOT BE CHANGED after that.",
              "Note that all balances created before the addition of this feature use `ASSET_TAG_DEFAULT`"
            ];
            type: "u8";
          },
          {
            name: "pad0";
            type: {
              array: ["u8", 6];
            };
          },
          {
            name: "assetShares";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "liabilityShares";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "emissionsOutstanding";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "lastUpdate";
            type: "u64";
          },
          {
            name: "padding";
            type: {
              array: ["u64", 1];
            };
          }
        ];
      };
    },
    {
      name: "bank";
      serialization: "bytemuckunsafe";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "mintDecimals";
            type: "u8";
          },
          {
            name: "group";
            type: "pubkey";
          },
          {
            name: "pad0";
            type: {
              array: ["u8", 7];
            };
          },
          {
            name: "assetShareValue";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "liabilityShareValue";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "liquidityVault";
            type: "pubkey";
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
            type: "pubkey";
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
            name: "pad1";
            type: {
              array: ["u8", 4];
            };
          },
          {
            name: "collectedInsuranceFeesOutstanding";
            docs: ["Fees collected and pending withdraw for the `insurance_vault`"];
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "feeVault";
            type: "pubkey";
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
            name: "pad2";
            type: {
              array: ["u8", 6];
            };
          },
          {
            name: "collectedGroupFeesOutstanding";
            docs: ["Fees collected and pending withdraw for the `fee_vault`"];
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "totalLiabilityShares";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "totalAssetShares";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "lastUpdate";
            type: "i64";
          },
          {
            name: "config";
            type: {
              defined: {
                name: "bankConfig";
              };
            };
          },
          {
            name: "flags";
            docs: [
              "Bank Config Flags",
              "",
              "- EMISSIONS_FLAG_BORROW_ACTIVE: 1",
              "- EMISSIONS_FLAG_LENDING_ACTIVE: 2",
              "- PERMISSIONLESS_BAD_DEBT_SETTLEMENT: 4",
              ""
            ];
            type: "u64";
          },
          {
            name: "emissionsRate";
            docs: [
              "Emissions APR.",
              "Number of emitted tokens (emissions_mint) per 1e(bank.mint_decimal) tokens (bank mint) (native amount) per 1 YEAR."
            ];
            type: "u64";
          },
          {
            name: "emissionsRemaining";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "emissionsMint";
            type: "pubkey";
          },
          {
            name: "collectedProgramFeesOutstanding";
            docs: [
              "Fees collected and pending withdraw for the `FeeState.global_fee_wallet`'s cannonical ATA for `mint`"
            ];
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "padding0";
            type: {
              array: [
                {
                  array: ["u64", 2];
                },
                27
              ];
            };
          },
          {
            name: "padding1";
            type: {
              array: [
                {
                  array: ["u64", 2];
                },
                32
              ];
            };
          }
        ];
      };
    },
    {
      name: "bankConfig";
      docs: ["TODO: Convert weights to (u64, u64) to avoid precision loss (maybe?)"];
      serialization: "bytemuckunsafe";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "assetWeightInit";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "assetWeightMaint";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "liabilityWeightInit";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "liabilityWeightMaint";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "depositLimit";
            type: "u64";
          },
          {
            name: "interestRateConfig";
            type: {
              defined: {
                name: "interestRateConfig";
              };
            };
          },
          {
            name: "operationalState";
            type: {
              defined: {
                name: "bankOperationalState";
              };
            };
          },
          {
            name: "oracleSetup";
            type: {
              defined: {
                name: "oracleSetup";
              };
            };
          },
          {
            name: "oracleKeys";
            type: {
              array: ["pubkey", 5];
            };
          },
          {
            name: "pad0";
            type: {
              array: ["u8", 6];
            };
          },
          {
            name: "borrowLimit";
            type: "u64";
          },
          {
            name: "riskTier";
            type: {
              defined: {
                name: "riskTier";
              };
            };
          },
          {
            name: "assetTag";
            docs: [
              "Determines what kinds of assets users of this bank can interact with.",
              "Options:",
              "* ASSET_TAG_DEFAULT (0) - A regular asset that can be comingled with any other regular asset",
              "or with `ASSET_TAG_SOL`",
              "* ASSET_TAG_SOL (1) - Accounts with a SOL position can comingle with **either**",
              "`ASSET_TAG_DEFAULT` or `ASSET_TAG_STAKED` positions, but not both",
              "* ASSET_TAG_STAKED (2) - Staked SOL assets. Accounts with a STAKED position can only deposit",
              "other STAKED assets or SOL (`ASSET_TAG_SOL`) and can only borrow SOL"
            ];
            type: "u8";
          },
          {
            name: "pad1";
            type: {
              array: ["u8", 6];
            };
          },
          {
            name: "totalAssetValueInitLimit";
            docs: [
              "USD denominated limit for calculating asset value for initialization margin requirements.",
              "Example, if total SOL deposits are equal to $1M and the limit it set to $500K,",
              "then SOL assets will be discounted by 50%.",
              "",
              "In other words the max value of liabilities that can be backed by the asset is $500K.",
              "This is useful for limiting the damage of orcale attacks.",
              "",
              "Value is UI USD value, for example value 100 -> $100"
            ];
            type: "u64";
          },
          {
            name: "oracleMaxAge";
            docs: ["Time window in seconds for the oracle price feed to be considered live."];
            type: "u16";
          },
          {
            name: "padding";
            type: {
              array: ["u8", 38];
            };
          }
        ];
      };
    },
    {
      name: "bankConfigCompact";
      docs: ["TODO: Convert weights to (u64, u64) to avoid precision loss (maybe?)"];
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "assetWeightInit";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "assetWeightMaint";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "liabilityWeightInit";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "liabilityWeightMaint";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "depositLimit";
            type: "u64";
          },
          {
            name: "interestRateConfig";
            type: {
              defined: {
                name: "interestRateConfigCompact";
              };
            };
          },
          {
            name: "operationalState";
            type: {
              defined: {
                name: "bankOperationalState";
              };
            };
          },
          {
            name: "borrowLimit";
            type: "u64";
          },
          {
            name: "riskTier";
            type: {
              defined: {
                name: "riskTier";
              };
            };
          },
          {
            name: "assetTag";
            docs: [
              "Determines what kinds of assets users of this bank can interact with.",
              "Options:",
              "* ASSET_TAG_DEFAULT (0) - A regular asset that can be comingled with any other regular asset",
              "or with `ASSET_TAG_SOL`",
              "* ASSET_TAG_SOL (1) - Accounts with a SOL position can comingle with **either**",
              "`ASSET_TAG_DEFAULT` or `ASSET_TAG_STAKED` positions, but not both",
              "* ASSET_TAG_STAKED (2) - Staked SOL assets. Accounts with a STAKED position can only deposit",
              "other STAKED assets or SOL (`ASSET_TAG_SOL`) and can only borrow SOL"
            ];
            type: "u8";
          },
          {
            name: "pad0";
            type: {
              array: ["u8", 6];
            };
          },
          {
            name: "totalAssetValueInitLimit";
            docs: [
              "USD denominated limit for calculating asset value for initialization margin requirements.",
              "Example, if total SOL deposits are equal to $1M and the limit it set to $500K,",
              "then SOL assets will be discounted by 50%.",
              "",
              "In other words the max value of liabilities that can be backed by the asset is $500K.",
              "This is useful for limiting the damage of orcale attacks.",
              "",
              "Value is UI USD value, for example value 100 -> $100"
            ];
            type: "u64";
          },
          {
            name: "oracleMaxAge";
            docs: ["Time window in seconds for the oracle price feed to be considered live."];
            type: "u16";
          }
        ];
      };
    },
    {
      name: "bankConfigOpt";
      type: {
        kind: "struct";
        fields: [
          {
            name: "assetWeightInit";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "assetWeightMaint";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "liabilityWeightInit";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "liabilityWeightMaint";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "depositLimit";
            type: {
              option: "u64";
            };
          },
          {
            name: "borrowLimit";
            type: {
              option: "u64";
            };
          },
          {
            name: "operationalState";
            type: {
              option: {
                defined: {
                  name: "bankOperationalState";
                };
              };
            };
          },
          {
            name: "interestRateConfig";
            type: {
              option: {
                defined: {
                  name: "interestRateConfigOpt";
                };
              };
            };
          },
          {
            name: "riskTier";
            type: {
              option: {
                defined: {
                  name: "riskTier";
                };
              };
            };
          },
          {
            name: "assetTag";
            type: {
              option: "u8";
            };
          },
          {
            name: "totalAssetValueInitLimit";
            type: {
              option: "u64";
            };
          },
          {
            name: "oracleMaxAge";
            type: {
              option: "u16";
            };
          },
          {
            name: "permissionlessBadDebtSettlement";
            type: {
              option: "bool";
            };
          },
          {
            name: "freezeSettings";
            type: {
              option: "bool";
            };
          }
        ];
      };
    },
    {
      name: "bankOperationalState";
      repr: {
        kind: "rust";
      };
      type: {
        kind: "enum";
        variants: [
          {
            name: "paused";
          },
          {
            name: "operational";
          },
          {
            name: "reduceOnly";
          }
        ];
      };
    },
    {
      name: "editStakedSettingsEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "group";
            type: "pubkey";
          },
          {
            name: "settings";
            type: {
              defined: {
                name: "stakedSettingsEditConfig";
              };
            };
          }
        ];
      };
    },
    {
      name: "feeState";
      docs: ["Unique per-program. The Program Owner uses this account to administrate fees collected by the protocol"];
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "key";
            docs: ['The fee state\'s own key. A PDA derived from just `b"feestate"`'];
            type: "pubkey";
          },
          {
            name: "globalFeeAdmin";
            docs: ["Can modify fees"];
            type: "pubkey";
          },
          {
            name: "globalFeeWallet";
            docs: [
              "The base wallet for all protocol fees. All SOL fees go to this wallet. All non-SOL fees go",
              "to the cannonical ATA of this wallet for that asset."
            ];
            type: "pubkey";
          },
          {
            name: "placeholder0";
            type: "u64";
          },
          {
            name: "bankInitFlatSolFee";
            docs: ["Flat fee assessed when a new bank is initialized, in lamports.", "* In SOL, in native decimals."];
            type: "u32";
          },
          {
            name: "bumpSeed";
            type: "u8";
          },
          {
            name: "padding0";
            type: {
              array: ["u8", 4];
            };
          },
          {
            name: "padding1";
            type: {
              array: ["u8", 15];
            };
          },
          {
            name: "programFeeFixed";
            docs: ["Fee collected by the program owner from all groups"];
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "programFeeRate";
            docs: ["Fee collected by the program owner from all groups"];
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "reserved0";
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "reserved1";
            type: {
              array: ["u8", 64];
            };
          }
        ];
      };
    },
    {
      name: "feeStateCache";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "globalFeeWallet";
            type: "pubkey";
          },
          {
            name: "programFeeFixed";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "programFeeRate";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          }
        ];
      };
    },
    {
      name: "groupConfig";
      type: {
        kind: "struct";
        fields: [
          {
            name: "admin";
            type: {
              option: "pubkey";
            };
          }
        ];
      };
    },
    {
      name: "groupEventHeader";
      type: {
        kind: "struct";
        fields: [
          {
            name: "signer";
            type: {
              option: "pubkey";
            };
          },
          {
            name: "marginfiGroup";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "interestRateConfig";
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "optimalUtilizationRate";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "plateauInterestRate";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "maxInterestRate";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "insuranceFeeFixedApr";
            docs: ["Goes to insurance, funds `collected_insurance_fees_outstanding`"];
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "insuranceIrFee";
            docs: ["Goes to insurance, funds `collected_insurance_fees_outstanding`"];
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "protocolFixedFeeApr";
            docs: ["Earned by the group, goes to `collected_group_fees_outstanding`"];
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "protocolIrFee";
            docs: ["Earned by the group, goes to `collected_group_fees_outstanding`"];
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "protocolOriginationFee";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "padding0";
            type: {
              array: ["u8", 16];
            };
          },
          {
            name: "padding1";
            type: {
              array: [
                {
                  array: ["u8", 32];
                },
                3
              ];
            };
          }
        ];
      };
    },
    {
      name: "interestRateConfigCompact";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "optimalUtilizationRate";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "plateauInterestRate";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "maxInterestRate";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "insuranceFeeFixedApr";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "insuranceIrFee";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "protocolFixedFeeApr";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "protocolIrFee";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "protocolOriginationFee";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          }
        ];
      };
    },
    {
      name: "interestRateConfigOpt";
      type: {
        kind: "struct";
        fields: [
          {
            name: "optimalUtilizationRate";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "plateauInterestRate";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "maxInterestRate";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "insuranceFeeFixedApr";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "insuranceIrFee";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "protocolFixedFeeApr";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "protocolIrFee";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "protocolOriginationFee";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          }
        ];
      };
    },
    {
      name: "lendingAccount";
      serialization: "bytemuckunsafe";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "balances";
            type: {
              array: [
                {
                  defined: {
                    name: "balance";
                  };
                },
                16
              ];
            };
          },
          {
            name: "padding";
            type: {
              array: ["u64", 8];
            };
          }
        ];
      };
    },
    {
      name: "lendingAccountBorrowEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "accountEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "amount";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "lendingAccountDepositEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "accountEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "amount";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "lendingAccountLiquidateEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "accountEventHeader";
              };
            };
          },
          {
            name: "liquidateeMarginfiAccount";
            type: "pubkey";
          },
          {
            name: "liquidateeMarginfiAccountAuthority";
            type: "pubkey";
          },
          {
            name: "assetBank";
            type: "pubkey";
          },
          {
            name: "assetMint";
            type: "pubkey";
          },
          {
            name: "liabilityBank";
            type: "pubkey";
          },
          {
            name: "liabilityMint";
            type: "pubkey";
          },
          {
            name: "liquidateePreHealth";
            type: "f64";
          },
          {
            name: "liquidateePostHealth";
            type: "f64";
          },
          {
            name: "preBalances";
            type: {
              defined: {
                name: "liquidationBalances";
              };
            };
          },
          {
            name: "postBalances";
            type: {
              defined: {
                name: "liquidationBalances";
              };
            };
          }
        ];
      };
    },
    {
      name: "lendingAccountRepayEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "accountEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "closeBalance";
            type: "bool";
          }
        ];
      };
    },
    {
      name: "lendingAccountWithdrawEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "accountEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "closeBalance";
            type: "bool";
          }
        ];
      };
    },
    {
      name: "lendingPoolBankAccrueInterestEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "groupEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "delta";
            type: "u64";
          },
          {
            name: "feesCollected";
            type: "f64";
          },
          {
            name: "insuranceCollected";
            type: "f64";
          }
        ];
      };
    },
    {
      name: "lendingPoolBankCollectFeesEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "groupEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "groupFeesCollected";
            type: "f64";
          },
          {
            name: "groupFeesOutstanding";
            type: "f64";
          },
          {
            name: "insuranceFeesCollected";
            type: "f64";
          },
          {
            name: "insuranceFeesOutstanding";
            type: "f64";
          }
        ];
      };
    },
    {
      name: "lendingPoolBankConfigureEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "groupEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "config";
            type: {
              defined: {
                name: "bankConfigOpt";
              };
            };
          }
        ];
      };
    },
    {
      name: "lendingPoolBankConfigureFrozenEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "groupEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "depositLimit";
            type: "u64";
          },
          {
            name: "borrowLimit";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "lendingPoolBankConfigureOracleEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "groupEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "oracleSetup";
            type: "u8";
          },
          {
            name: "oracle";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "lendingPoolBankCreateEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "groupEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "lendingPoolBankHandleBankruptcyEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "accountEventHeader";
              };
            };
          },
          {
            name: "bank";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "badDebt";
            type: "f64";
          },
          {
            name: "coveredAmount";
            type: "f64";
          },
          {
            name: "socializedAmount";
            type: "f64";
          }
        ];
      };
    },
    {
      name: "liquidationBalances";
      type: {
        kind: "struct";
        fields: [
          {
            name: "liquidateeAssetBalance";
            type: "f64";
          },
          {
            name: "liquidateeLiabilityBalance";
            type: "f64";
          },
          {
            name: "liquidatorAssetBalance";
            type: "f64";
          },
          {
            name: "liquidatorLiabilityBalance";
            type: "f64";
          }
        ];
      };
    },
    {
      name: "marginfiAccount";
      serialization: "bytemuckunsafe";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "group";
            type: "pubkey";
          },
          {
            name: "authority";
            type: "pubkey";
          },
          {
            name: "lendingAccount";
            type: {
              defined: {
                name: "lendingAccount";
              };
            };
          },
          {
            name: "accountFlags";
            docs: [
              "The flags that indicate the state of the account.",
              "This is u64 bitfield, where each bit represents a flag.",
              "",
              "Flags:",
              "- DISABLED_FLAG = 1 << 0 = 1 - This flag indicates that the account is disabled,",
              "and no further actions can be taken on it.",
              "- IN_FLASHLOAN_FLAG (1 << 1)",
              "- FLASHLOAN_ENABLED_FLAG (1 << 2)",
              "- TRANSFER_AUTHORITY_ALLOWED_FLAG (1 << 3)"
            ];
            type: "u64";
          },
          {
            name: "padding";
            type: {
              array: ["u64", 63];
            };
          }
        ];
      };
    },
    {
      name: "marginfiAccountCreateEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "accountEventHeader";
              };
            };
          }
        ];
      };
    },
    {
      name: "marginfiAccountTransferAccountAuthorityEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "accountEventHeader";
              };
            };
          },
          {
            name: "oldAccountAuthority";
            type: "pubkey";
          },
          {
            name: "newAccountAuthority";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "marginfiGroup";
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "admin";
            type: "pubkey";
          },
          {
            name: "groupFlags";
            docs: [
              "Bitmask for group settings flags.",
              "* Bit 0: If set, program-level fees are enabled.",
              "* Bits 1-63: Reserved for future use."
            ];
            type: "u64";
          },
          {
            name: "feeStateCache";
            docs: ["Caches information from the global `FeeState` so the FeeState can be omitted on certain ixes"];
            type: {
              defined: {
                name: "feeStateCache";
              };
            };
          },
          {
            name: "padding0";
            type: {
              array: [
                {
                  array: ["u64", 2];
                },
                27
              ];
            };
          },
          {
            name: "padding1";
            type: {
              array: [
                {
                  array: ["u64", 2];
                },
                32
              ];
            };
          },
          {
            name: "padding3";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "marginfiGroupConfigureEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "groupEventHeader";
              };
            };
          },
          {
            name: "config";
            type: {
              defined: {
                name: "groupConfig";
              };
            };
          }
        ];
      };
    },
    {
      name: "marginfiGroupCreateEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            type: {
              defined: {
                name: "groupEventHeader";
              };
            };
          }
        ];
      };
    },
    {
      name: "oracleSetup";
      repr: {
        kind: "rust";
      };
      type: {
        kind: "enum";
        variants: [
          {
            name: "none";
          },
          {
            name: "pythLegacy";
          },
          {
            name: "switchboardV2";
          },
          {
            name: "pythPushOracle";
          },
          {
            name: "switchboardPull";
          },
          {
            name: "stakedWithPythPush";
          }
        ];
      };
    },
    {
      name: "riskTier";
      repr: {
        kind: "rust";
      };
      type: {
        kind: "enum";
        variants: [
          {
            name: "collateral";
          },
          {
            name: "isolated";
          }
        ];
      };
    },
    {
      name: "stakedSettings";
      docs: [
        "Unique per-group. Staked Collateral banks created under a group automatically use these",
        "settings. Groups that have not created this struct cannot create staked collateral banks. When",
        "this struct updates, changes must be permissionlessly propogated to staked collateral banks.",
        "Administrators can also edit the bank manually, i.e. with configure_bank, to temporarily make",
        "changes such as raising the deposit limit for a single bank."
      ];
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "key";
            docs: ["This account's own key. A PDA derived from `marginfi_group` and `STAKED_SETTINGS_SEED`"];
            type: "pubkey";
          },
          {
            name: "marginfiGroup";
            docs: ["Group for which these settings apply"];
            type: "pubkey";
          },
          {
            name: "oracle";
            docs: ["Generally, the Pyth push oracle for SOL"];
            type: "pubkey";
          },
          {
            name: "assetWeightInit";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "assetWeightMaint";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "depositLimit";
            type: "u64";
          },
          {
            name: "totalAssetValueInitLimit";
            type: "u64";
          },
          {
            name: "oracleMaxAge";
            type: "u16";
          },
          {
            name: "riskTier";
            type: {
              defined: {
                name: "riskTier";
              };
            };
          },
          {
            name: "pad0";
            type: {
              array: ["u8", 5];
            };
          },
          {
            name: "reserved0";
            docs: [
              "The following values are irrelevant because staked collateral positions do not support",
              "borrowing."
            ];
            type: {
              array: ["u8", 8];
            };
          },
          {
            name: "reserved1";
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "reserved2";
            type: {
              array: ["u8", 64];
            };
          }
        ];
      };
    },
    {
      name: "stakedSettingsConfig";
      type: {
        kind: "struct";
        fields: [
          {
            name: "oracle";
            type: "pubkey";
          },
          {
            name: "assetWeightInit";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "assetWeightMaint";
            type: {
              defined: {
                name: "wrappedI80f48";
              };
            };
          },
          {
            name: "depositLimit";
            type: "u64";
          },
          {
            name: "totalAssetValueInitLimit";
            type: "u64";
          },
          {
            name: "oracleMaxAge";
            type: "u16";
          },
          {
            name: "riskTier";
            docs: [
              'WARN: You almost certainly want "Collateral", using Isolated risk tier makes the asset',
              "worthless as collateral, and is generally useful only when creating a staked collateral pool",
              "for rewards purposes only."
            ];
            type: {
              defined: {
                name: "riskTier";
              };
            };
          }
        ];
      };
    },
    {
      name: "stakedSettingsEditConfig";
      type: {
        kind: "struct";
        fields: [
          {
            name: "oracle";
            type: {
              option: "pubkey";
            };
          },
          {
            name: "assetWeightInit";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "assetWeightMaint";
            type: {
              option: {
                defined: {
                  name: "wrappedI80f48";
                };
              };
            };
          },
          {
            name: "depositLimit";
            type: {
              option: "u64";
            };
          },
          {
            name: "totalAssetValueInitLimit";
            type: {
              option: "u64";
            };
          },
          {
            name: "oracleMaxAge";
            type: {
              option: "u16";
            };
          },
          {
            name: "riskTier";
            docs: [
              'WARN: You almost certainly want "Collateral", using Isolated risk tier makes the asset',
              "worthless as collateral, making all outstanding accounts eligible to be liquidated, and is",
              "generally useful only when creating a staked collateral pool for rewards purposes only."
            ];
            type: {
              option: {
                defined: {
                  name: "riskTier";
                };
              };
            };
          }
        ];
      };
    },
    {
      name: "wrappedI80f48";
      serialization: "bytemuck";
      repr: {
        kind: "c";
        align: 8;
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "value";
            type: {
              array: ["u8", 16];
            };
          }
        ];
      };
    }
  ];
};
