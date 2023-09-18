export type StakePoolProxy = {
  "version": "0.1.0",
  "name": "stake_pool_proxy",
  "instructions": [
    {
      "name": "depositAllSol",
      "accounts": [
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "reserveStakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lamportsFrom",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "poolTokensTo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "referrerPoolTokensAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ]
};

export const IDL: StakePoolProxy = {
  "version": "0.1.0",
  "name": "stake_pool_proxy",
  "instructions": [
    {
      "name": "depositAllSol",
      "accounts": [
        {
          "name": "stakePool",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePoolWithdrawAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "reserveStakeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lamportsFrom",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "poolTokensTo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "managerFeeAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "referrerPoolTokensAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "poolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "stakePoolProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ]
};
