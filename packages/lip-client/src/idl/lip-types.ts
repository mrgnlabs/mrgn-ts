export type LiquidityIncentiveProgram = {
  version: "0.1.0";
  name: "liquidity_incentive_program";
  constants: [
    {
      name: "CAMPAIGN_SEED";
      type: "string";
      value: '"campaign"';
    },
    {
      name: "CAMPAIGN_AUTH_SEED";
      type: "string";
      value: '"campaign_auth"';
    },
    {
      name: "DEPOSIT_MFI_AUTH_SIGNER_SEED";
      type: "string";
      value: '"deposit_mfi_auth"';
    },
    {
      name: "TEMP_TOKEN_ACCOUNT_AUTH_SEED";
      type: "string";
      value: '"ephemeral_token_account_auth"';
    },
    {
      name: "MARGINFI_ACCOUNT_SEED";
      type: "string";
      value: '"marginfi_account"';
    }
  ];
  instructions: [
    {
      name: "createCampaign";
      docs: [
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
      ];
      accounts: [
        {
          name: "campaign";
          isMut: true;
          isSigner: true;
        },
        {
          name: "campaignRewardVault";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "campaign";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Campaign";
                path: "campaign";
              }
            ];
          };
        },
        {
          name: "campaignRewardVaultAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "campaign_auth";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Campaign";
                path: "campaign";
              }
            ];
          };
        },
        {
          name: "assetMint";
          isMut: false;
          isSigner: false;
          docs: ["asserted by comparing the mint of the marginfi bank"];
        },
        {
          name: "marginfiBank";
          isMut: false;
          isSigner: false;
        },
        {
          name: "admin";
          isMut: true;
          isSigner: true;
        },
        {
          name: "fundingAccount";
          isMut: true;
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
          name: "lockupPeriod";
          type: "u64";
        },
        {
          name: "maxDeposits";
          type: "u64";
        },
        {
          name: "maxRewards";
          type: "u64";
        }
      ];
    },
    {
      name: "createDeposit";
      docs: [
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
      ];
      accounts: [
        {
          name: "campaign";
          isMut: true;
          isSigner: false;
        },
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "deposit";
          isMut: true;
          isSigner: true;
        },
        {
          name: "mfiPdaSigner";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "deposit_mfi_auth";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Deposit";
                path: "deposit";
              }
            ];
          };
        },
        {
          name: "fundingAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tempTokenAccount";
          isMut: true;
          isSigner: true;
        },
        {
          name: "assetMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "marginfiGroup";
          isMut: false;
          isSigner: false;
          docs: ["marginfi_bank is tied to a specific marginfi_group"];
        },
        {
          name: "marginfiBank";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marginfiAccount";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "marginfi_account";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Deposit";
                path: "deposit";
              }
            ];
          };
        },
        {
          name: "marginfiBankVault";
          isMut: true;
          isSigner: false;
          docs: [
            "marginfi_bank_vault is tied to a specific marginfi_bank,",
            "passing in an incorrect vault will fail the CPI call"
          ];
        },
        {
          name: "marginfiProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
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
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "endDeposit";
      docs: [
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
      ];
      accounts: [
        {
          name: "campaign";
          isMut: false;
          isSigner: false;
        },
        {
          name: "campaignRewardVault";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "campaign";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Campaign";
                path: "campaign";
              }
            ];
          };
        },
        {
          name: "campaignRewardVaultAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "campaign_auth";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Campaign";
                path: "campaign";
              }
            ];
          };
        },
        {
          name: "signer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "deposit";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mfiPdaSigner";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "deposit_mfi_auth";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Deposit";
                path: "deposit";
              }
            ];
          };
        },
        {
          name: "tempTokenAccount";
          isMut: true;
          isSigner: true;
        },
        {
          name: "tempTokenAccountAuthority";
          isMut: false;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "ephemeral_token_account_auth";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Deposit";
                path: "deposit";
              }
            ];
          };
        },
        {
          name: "destinationAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "assetMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "marginfiAccount";
          isMut: true;
          isSigner: false;
          pda: {
            seeds: [
              {
                kind: "const";
                type: "string";
                value: "marginfi_account";
              },
              {
                kind: "account";
                type: "publicKey";
                account: "Deposit";
                path: "deposit";
              }
            ];
          };
        },
        {
          name: "marginfiGroup";
          isMut: false;
          isSigner: false;
        },
        {
          name: "marginfiBank";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marginfiBankVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marginfiBankVaultAuthority";
          isMut: true;
          isSigner: false;
        },
        {
          name: "marginfiProgram";
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
      args: [];
    }
  ];
  accounts: [
    {
      name: "campaign";
      type: {
        kind: "struct";
        fields: [
          {
            name: "admin";
            type: "publicKey";
          },
          {
            name: "lockupPeriod";
            type: "u64";
          },
          {
            name: "active";
            type: "bool";
          },
          {
            name: "maxDeposits";
            type: "u64";
          },
          {
            name: "remainingCapacity";
            type: "u64";
          },
          {
            name: "maxRewards";
            type: "u64";
          },
          {
            name: "marginfiBankPk";
            type: "publicKey";
          },
          {
            name: "padding";
            type: {
              array: ["u64", 16];
            };
          }
        ];
      };
    },
    {
      name: "deposit";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "publicKey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "startTime";
            type: "i64";
          },
          {
            name: "campaign";
            type: "publicKey";
          },
          {
            name: "padding";
            type: {
              array: ["u64", 16];
            };
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "CampaignNotActive";
      msg: "Campaign is not active";
    },
    {
      code: 6001;
      name: "DepositAmountTooLarge";
      msg: "Deposit amount is to large";
    },
    {
      code: 6002;
      name: "DepositNotMature";
      msg: "Deposit hasn't matured yet";
    }
  ];
};

export const IDL: LiquidityIncentiveProgram = {
  version: "0.1.0",
  name: "liquidity_incentive_program",
  constants: [
    {
      name: "CAMPAIGN_SEED",
      type: "string",
      value: '"campaign"',
    },
    {
      name: "CAMPAIGN_AUTH_SEED",
      type: "string",
      value: '"campaign_auth"',
    },
    {
      name: "DEPOSIT_MFI_AUTH_SIGNER_SEED",
      type: "string",
      value: '"deposit_mfi_auth"',
    },
    {
      name: "TEMP_TOKEN_ACCOUNT_AUTH_SEED",
      type: "string",
      value: '"ephemeral_token_account_auth"',
    },
    {
      name: "MARGINFI_ACCOUNT_SEED",
      type: "string",
      value: '"marginfi_account"',
    },
  ],
  instructions: [
    {
      name: "createCampaign",
      docs: [
        "Creates a new liquidity incentive campaign (LIP).",
        "",
        "# Arguments",
        "* `ctx`: Context struct containing the relevant accounts for the campaign.",
        "* `lockup_period`: The length of time (in seconds) that a deposit must be locked up for in order to earn the full reward.",
        "* `max_deposits`: The maximum number of tokens that can be deposited into the campaign by liquidity providers.",
        "* `max_rewards`: The maximum amount of rewards that will be distributed to depositors, and also the amount of token rewards transferred into the vault by the campaign creator.",
        "",
        "# Returns",
        "* `Ok(())` if the campaign was successfully created, or an error otherwise.",
      ],
      accounts: [
        {
          name: "campaign",
          isMut: true,
          isSigner: true,
        },
        {
          name: "campaignRewardVault",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "campaign",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Campaign",
                path: "campaign",
              },
            ],
          },
        },
        {
          name: "campaignRewardVaultAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "campaign_auth",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Campaign",
                path: "campaign",
              },
            ],
          },
        },
        {
          name: "assetMint",
          isMut: false,
          isSigner: false,
          docs: ["asserted by comparing the mint of the marginfi bank"],
        },
        {
          name: "marginfiBank",
          isMut: false,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true,
        },
        {
          name: "fundingAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "lockupPeriod",
          type: "u64",
        },
        {
          name: "maxDeposits",
          type: "u64",
        },
        {
          name: "maxRewards",
          type: "u64",
        },
      ],
    },
    {
      name: "createDeposit",
      docs: [
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
        "* `LIPError::DepositAmountTooLarge` is the deposit amount exceeds the amount of remaining deposits that can be made into the campaign.",
      ],
      accounts: [
        {
          name: "campaign",
          isMut: true,
          isSigner: false,
        },
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "deposit",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mfiPdaSigner",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "deposit_mfi_auth",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Deposit",
                path: "deposit",
              },
            ],
          },
        },
        {
          name: "fundingAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tempTokenAccount",
          isMut: true,
          isSigner: true,
        },
        {
          name: "assetMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "marginfiGroup",
          isMut: false,
          isSigner: false,
          docs: ["marginfi_bank is tied to a specific marginfi_group"],
        },
        {
          name: "marginfiBank",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marginfiAccount",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "marginfi_account",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Deposit",
                path: "deposit",
              },
            ],
          },
        },
        {
          name: "marginfiBankVault",
          isMut: true,
          isSigner: false,
          docs: [
            "marginfi_bank_vault is tied to a specific marginfi_bank,",
            "passing in an incorrect vault will fail the CPI call",
          ],
        },
        {
          name: "marginfiProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
    {
      name: "endDeposit",
      docs: [
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
        "* Reloading ephemeral token account after transfer fails",
      ],
      accounts: [
        {
          name: "campaign",
          isMut: false,
          isSigner: false,
        },
        {
          name: "campaignRewardVault",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "campaign",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Campaign",
                path: "campaign",
              },
            ],
          },
        },
        {
          name: "campaignRewardVaultAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "campaign_auth",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Campaign",
                path: "campaign",
              },
            ],
          },
        },
        {
          name: "signer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "deposit",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mfiPdaSigner",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "deposit_mfi_auth",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Deposit",
                path: "deposit",
              },
            ],
          },
        },
        {
          name: "tempTokenAccount",
          isMut: true,
          isSigner: true,
        },
        {
          name: "tempTokenAccountAuthority",
          isMut: false,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "ephemeral_token_account_auth",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Deposit",
                path: "deposit",
              },
            ],
          },
        },
        {
          name: "destinationAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "assetMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "marginfiAccount",
          isMut: true,
          isSigner: false,
          pda: {
            seeds: [
              {
                kind: "const",
                type: "string",
                value: "marginfi_account",
              },
              {
                kind: "account",
                type: "publicKey",
                account: "Deposit",
                path: "deposit",
              },
            ],
          },
        },
        {
          name: "marginfiGroup",
          isMut: false,
          isSigner: false,
        },
        {
          name: "marginfiBank",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marginfiBankVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marginfiBankVaultAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "marginfiProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "campaign",
      type: {
        kind: "struct",
        fields: [
          {
            name: "admin",
            type: "publicKey",
          },
          {
            name: "lockupPeriod",
            type: "u64",
          },
          {
            name: "active",
            type: "bool",
          },
          {
            name: "maxDeposits",
            type: "u64",
          },
          {
            name: "remainingCapacity",
            type: "u64",
          },
          {
            name: "maxRewards",
            type: "u64",
          },
          {
            name: "marginfiBankPk",
            type: "publicKey",
          },
          {
            name: "padding",
            type: {
              array: ["u64", 16],
            },
          },
        ],
      },
    },
    {
      name: "deposit",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "publicKey",
          },
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "startTime",
            type: "i64",
          },
          {
            name: "campaign",
            type: "publicKey",
          },
          {
            name: "padding",
            type: {
              array: ["u64", 16],
            },
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "CampaignNotActive",
      msg: "Campaign is not active",
    },
    {
      code: 6001,
      name: "DepositAmountTooLarge",
      msg: "Deposit amount is to large",
    },
    {
      code: 6002,
      name: "DepositNotMature",
      msg: "Deposit hasn't matured yet",
    },
  ],
};
