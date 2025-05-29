/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pyth_push_oracle.json`.
 */
export type PythPushOracle = {
  address: "pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT";
  metadata: {
    name: "pythPushOracle";
    version: "0.1.0";
    spec: "0.1.0";
  };
  instructions: [
    {
      name: "updatePriceFeed";
      discriminator: [28, 9, 93, 150, 86, 153, 188, 115];
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
            defined: {
              name: "postUpdateParams";
            };
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
  errors: [
    {
      code: 6000;
      name: "updatesNotMonotonic";
      msg: "Updates must be monotonically increasing";
    },
    {
      code: 6001;
      name: "priceFeedMessageMismatch";
      msg: "Trying to update price feed with the wrong feed id";
    },
  ];
  types: [
    {
      name: "postUpdateParams";
      type: {
        kind: "struct";
        fields: [
          {
            name: "merklePriceUpdate";
            type: {
              defined: {
                name: "merklePriceUpdate";
              };
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
      name: "merklePriceUpdate";
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
};

export const PYTH_PUSH_ORACLE_IDL: PythPushOracle = {
  address: "pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT",
  metadata: {
    name: "pythPushOracle",
    version: "0.1.0",
    spec: "0.1.0",
  },
  instructions: [
    {
      name: "updatePriceFeed",
      discriminator: [28, 9, 93, 150, 86, 153, 188, 115],
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
            defined: {
              name: "postUpdateParams",
            },
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
  errors: [
    {
      code: 6000,
      name: "updatesNotMonotonic",
      msg: "Updates must be monotonically increasing",
    },
    {
      code: 6001,
      name: "priceFeedMessageMismatch",
      msg: "Trying to update price feed with the wrong feed id",
    },
  ],
  types: [
    {
      name: "postUpdateParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "merklePriceUpdate",
            type: {
              defined: {
                name: "merklePriceUpdate",
              },
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
      name: "merklePriceUpdate",
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
};
