export type PythPushOracleProgram = {
  version: "0.1.0";
  name: "pyth_push_oracle";
  address: "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ";
  metadata: {
    name: "pyth_push_oracle";
    version: "0.1.0";
    spec: "0.1.0";
  };
  instructions: [
    {
      name: "updatePriceFeed";
      discriminator: [36, 241, 225, 146, 26, 31, 150, 131];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "pythSolanaReceiver";
        },
        {
          name: "encodedVaa";
        },
        {
          name: "config";
        },
        {
          name: "treasury";
          writable: true;
        },
        {
          name: "priceFeedAccount";
          writable: true;
        },
        {
          name: "systemProgram";
        },
      ];
      args: [
        {
          name: "params";
          type: {
            defined: { name: "PostUpdateParams" };
          };
        },
        {
          name: "shardId";
          type: "u16";
        },
        {
          name: "feedId";
          type: {
            array: ["u8", 32];
          };
        },
      ];
    },
  ];
  types: [
    {
      name: "PostUpdateParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "merklePriceUpdate";
            type: {
              defined: { name: "MerklePriceUpdate" };
            };
          },
          {
            name: "treasuryId";
            type: "u8";
          },
        ];
      };
    },
    {
      name: "MerklePriceUpdate";
      type: {
        kind: "struct";
        fields: [
          {
            name: "message";
            type: "bytes";
          },
          {
            name: "proof";
            type: {
              vec: {
                array: ["u8", 20];
              };
            };
          },
        ];
      };
    },
  ];
  errors: [
    {
      code: 6000;
      name: "UpdatesNotMonotonic";
      msg: "Updates must be monotonically increasing";
    },
    {
      code: 6001;
      name: "PriceFeedMessageMismatch";
      msg: "Trying to update price feed with the wrong feed id";
    },
  ];
};

export const PYTH_PUSH_ORACLE_PROGRAM_IDL: PythPushOracleProgram = {
  version: "0.1.0",
  name: "pyth_push_oracle",
  address: "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ",
  metadata: {
    name: "pyth_push_oracle",
    version: "0.1.0",
    spec: "0.1.0",
  },
  instructions: [
    {
      name: "updatePriceFeed",
      discriminator: [36, 241, 225, 146, 26, 31, 150, 131],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "pythSolanaReceiver",
        },
        {
          name: "encodedVaa",
        },
        {
          name: "config",
        },
        {
          name: "treasury",
          writable: true,
        },
        {
          name: "priceFeedAccount",
          writable: true,
        },
        {
          name: "systemProgram",
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: { name: "PostUpdateParams" },
          },
        },
        {
          name: "shardId",
          type: "u16",
        },
        {
          name: "feedId",
          type: {
            array: ["u8", 32],
          },
        },
      ],
    },
  ],
  types: [
    {
      name: "PostUpdateParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "merklePriceUpdate",
            type: {
              defined: { name: "MerklePriceUpdate" },
            },
          },
          {
            name: "treasuryId",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "MerklePriceUpdate",
      type: {
        kind: "struct",
        fields: [
          {
            name: "message",
            type: "bytes",
          },
          {
            name: "proof",
            type: {
              vec: {
                array: ["u8", 20],
              },
            },
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "UpdatesNotMonotonic",
      msg: "Updates must be monotonically increasing",
    },
    {
      code: 6001,
      name: "PriceFeedMessageMismatch",
      msg: "Trying to update price feed with the wrong feed id",
    },
  ],
};
