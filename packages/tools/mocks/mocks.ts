/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/mocks.json`.
 */
export type Mocks = {
  "address": "HfCg2Re4BnZmQ7SzUcw3fhBtf1fqWmtMY1wov59VFrYs",
  "metadata": {
    "name": "mocks",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "External program mocks"
  },
  "instructions": [
    {
      "name": "doNothing",
      "docs": [
        "Do nothing"
      ],
      "discriminator": [
        112,
        130,
        224,
        161,
        71,
        149,
        192,
        187
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initPoolAuth",
      "docs": [
        "Init authority for fake jupiter-like swap pools"
      ],
      "discriminator": [
        48,
        155,
        246,
        118,
        211,
        80,
        8,
        220
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Pays the init fee"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "poolAuth",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "nonce"
              },
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "mintA"
        },
        {
          "name": "mintB"
        },
        {
          "name": "poolA",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "mintA"
              },
              {
                "kind": "account",
                "path": "poolAuth"
              },
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "poolB",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "mintB"
              },
              {
                "kind": "account",
                "path": "poolAuth"
              },
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
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
          "name": "nonce",
          "type": "u16"
        }
      ]
    },
    {
      "name": "swapLikeJupiter",
      "docs": [
        "Execute an exchange of a:b like-jupiter. You set the amount a sent and b received."
      ],
      "discriminator": [
        53,
        0,
        48,
        18,
        207,
        211,
        11,
        240
      ],
      "accounts": [
        {
          "name": "userAuthority",
          "signer": true
        },
        {
          "name": "poolAuth",
          "docs": [
            "PDA authority of the pools"
          ]
        },
        {
          "name": "poolA",
          "writable": true
        },
        {
          "name": "poolB",
          "writable": true
        },
        {
          "name": "sourceA",
          "writable": true
        },
        {
          "name": "destinationB",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amtA",
          "type": "u64"
        },
        {
          "name": "amtB",
          "type": "u64"
        }
      ]
    },
    {
      "name": "write",
      "docs": [
        "Write arbitrary bytes to an arbitrary account. YOLO."
      ],
      "discriminator": [
        235,
        116,
        91,
        200,
        206,
        170,
        144,
        120
      ],
      "accounts": [
        {
          "name": "target",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "offset",
          "type": "u64"
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "poolAuth",
      "discriminator": [
        84,
        40,
        134,
        46,
        2,
        144,
        109,
        184
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "someError",
      "msg": "This is an error."
    }
  ],
  "types": [
    {
      "name": "poolAuth",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "docs": [
              "The account's own key"
            ],
            "type": "pubkey"
          },
          {
            "name": "poolA",
            "type": "pubkey"
          },
          {
            "name": "poolB",
            "type": "pubkey"
          },
          {
            "name": "bumpSeed",
            "type": "u8"
          },
          {
            "name": "nonce",
            "type": "u16"
          }
        ]
      }
    }
  ]
};
