/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/wormhole_core_bridge_solana.json`.
 */
export type WormholeCoreBridgeSolana = {
  address: "HDwcJBJXjL9FpJ7UBsYBtaDjsBUhuLCUYoz3zr8SWWaQ";
  metadata: {
    name: "wormholeCoreBridgeSolana";
    version: "0.0.1-alpha.5";
    spec: "0.1.0";
  };
  instructions: [
    {
      name: "initMessageV1";
      docs: [
        "Processor for initializing a new draft [PostedMessageV1](crate::state::PostedMessageV1)",
        "account for writing. The emitter authority is established at this point and the payload size",
        "is inferred from the size of the created account. This instruction handler also allows an",
        "integrator to publish Wormhole messages using his program's ID as the emitter address",
        "(by passing `Some(crate::ID)` to the [cpi_program_id](InitMessageV1Args::cpi_program_id)",
        'argument). **Be aware that the emitter authority\'s seeds must only be \\[b"emitter"\\] in this',
        "case.**",
        "",
        "This instruction should be followed up with `write_message_v1` and `finalize_message_v1` to",
        "write and indicate that the message is ready for publishing respectively (to prepare it for",
        "publishing via the",
        "[post message instruction](crate::legacy::instruction::LegacyInstruction::PostMessage)).",
        "",
        "NOTE: If you wish to publish a small message (one where the data does not overflow the",
        "Solana transaction size), it is recommended that you use an [sdk](crate::sdk::cpi) method to",
        "either prepare your message or post a message as a program ID emitter.",
      ];
      discriminator: [247, 187, 26, 16, 122, 198, 106, 247];
      accounts: [
        {
          name: "emitterAuthority";
          docs: ["This authority is the only one who can write to the draft message account."];
          signer: true;
        },
        {
          name: "draftMessage";
          docs: ["Bridge."];
          writable: true;
        },
      ];
      args: [
        {
          name: "args";
          type: {
            defined: {
              name: "initMessageV1Args";
            };
          };
        },
      ];
    },
    {
      name: "writeMessageV1";
      docs: [
        "Processor used to write to a draft [PostedMessageV1](crate::state::PostedMessageV1) account.",
        "This instruction requires an authority (the emitter authority) to interact with the message",
        "account.",
      ];
      discriminator: [35, 67, 197, 233, 94, 117, 124, 143];
      accounts: [
        {
          name: "emitterAuthority";
          signer: true;
        },
        {
          name: "draftMessage";
          docs: ["only be published when the message is finalized."];
          writable: true;
        },
      ];
      args: [
        {
          name: "args";
          type: {
            defined: {
              name: "writeMessageV1Args";
            };
          };
        },
      ];
    },
    {
      name: "finalizeMessageV1";
      docs: [
        "Processor used to finalize a draft [PostedMessageV1](crate::state::PostedMessageV1) account.",
        "Once finalized, this message account cannot be written to again. A finalized message is the",
        "only state the legacy post message instruction can accept before publishing. This",
        "instruction requires an authority (the emitter authority) to interact with the message",
        "account.",
      ];
      discriminator: [245, 208, 215, 228, 129, 56, 51, 251];
      accounts: [
        {
          name: "emitterAuthority";
          signer: true;
        },
        {
          name: "draftMessage";
          docs: ["only be published when the message is finalized."];
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: "closeMessageV1";
      docs: [
        "Processor used to process a draft [PostedMessageV1](crate::state::PostedMessageV1) account.",
        "This instruction requires an authority (the emitter authority) to interact with the message",
        "account.",
      ];
      discriminator: [36, 185, 40, 107, 239, 13, 51, 162];
      accounts: [
        {
          name: "emitterAuthority";
          signer: true;
        },
        {
          name: "draftMessage";
          docs: ["only be published when the message is finalized."];
          writable: true;
        },
        {
          name: "closeAccountDestination";
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: "initEncodedVaa";
      docs: [
        "Processor used to intialize a created account as [EncodedVaa](crate::state::EncodedVaa). An",
        "authority (the write authority) is established with this instruction.",
      ];
      discriminator: [209, 193, 173, 25, 91, 202, 181, 218];
      accounts: [
        {
          name: "writeAuthority";
          docs: ["The authority who can write to the VAA account when it is being processed."];
          signer: true;
        },
        {
          name: "encodedVaa";
          docs: ["Bridge."];
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: "closeEncodedVaa";
      docs: [
        "Processor used to close an [EncodedVaa](crate::state::EncodedVaa). This instruction requires",
        "an authority (the write authority) to interact witht he encoded VAA account.",
      ];
      discriminator: [48, 221, 174, 198, 231, 7, 152, 38];
      accounts: [
        {
          name: "writeAuthority";
          docs: [
            "This account is only required to be mutable for the `CloseVaaAccount` directive. This",
            "authority is the same signer that originally created the VAA accounts, so he is the one that",
            "will receive the lamports back for the closed accounts.",
          ];
          writable: true;
          signer: true;
        },
        {
          name: "encodedVaa";
          docs: ["written to and then verified."];
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: "writeEncodedVaa";
      docs: [
        "Processor used to write to an [EncodedVaa](crate::state::EncodedVaa) account. This",
        "instruction requires an authority (the write authority) to interact with the encoded VAA",
        "account.",
      ];
      discriminator: [199, 208, 110, 177, 150, 76, 118, 42];
      accounts: [
        {
          name: "writeAuthority";
          docs: ["The only authority that can write to the encoded VAA account."];
          signer: true;
        },
        {
          name: "draftVaa";
          docs: ["written to and then verified."];
          writable: true;
        },
      ];
      args: [
        {
          name: "args";
          type: {
            defined: {
              name: "writeEncodedVaaArgs";
            };
          };
        },
      ];
    },
    {
      name: "verifyEncodedVaaV1";
      docs: [
        "Processor used to verify an [EncodedVaa](crate::state::EncodedVaa) account as a version 1",
        "VAA (guardian signatures attesting to this observation). This instruction requires an",
        "authority (the write authority) to interact with the encoded VAA account.",
      ];
      discriminator: [103, 56, 177, 229, 240, 103, 68, 73];
      accounts: [
        {
          name: "writeAuthority";
          signer: true;
        },
        {
          name: "draftVaa";
          docs: ["written to and then verified."];
          writable: true;
        },
        {
          name: "guardianSet";
          docs: [
            "Guardian set account, which should be the same one that was used to attest for the VAA. The",
            "signatures in the encoded VAA are verified against this guardian set.",
          ];
        },
      ];
      args: [];
    },
    {
      name: "postVaaV1";
      docs: [
        "Processor used to close an [EncodedVaa](crate::state::EncodedVaa) account to create a",
        "[PostedMessageV1](crate::state::PostedMessageV1) account in its place.",
        "",
        "NOTE: Because the legacy verify signatures instruction was not required for the Posted VAA",
        "account to exist, the encoded [SignatureSet](crate::state::SignatureSet) is the default",
        "[Pubkey].",
      ];
      discriminator: [0, 57, 97, 3, 225, 37, 254, 31];
      accounts: [
        {
          name: "payer";
          docs: [
            "Payer to create the posted VAA account. This instruction allows anyone with an encoded VAA",
            "to create a posted VAA account.",
          ];
          writable: true;
          signer: true;
        },
        {
          name: "encodedVaa";
          docs: [
            "Encoded VAA, whose body will be serialized into the posted VAA account.",
            "",
            "NOTE: This instruction handler only exists to support integrators that still rely on posted",
            "VAA accounts. While we encourage integrators to use the encoded VAA account instead, we",
            "allow a pathway to convert the encoded VAA into a posted VAA. However, the payload is",
            "restricted to 9.5KB, which is much larger than what was possible with the old implementation",
            "using the legacy post vaa instruction. The Core Bridge program will not support posting VAAs",
            "larger than this payload size.",
          ];
        },
        {
          name: "postedVaa";
          writable: true;
        },
        {
          name: "systemProgram";
        },
      ];
      args: [];
    },
    {
      name: "closeSignatureSet";
      docs: [
        "Processor used to close a [SignatureSet](crate::state::SignatureSet), which was used to",
        "verify the VAA using the legacy parse and verify procedure.",
      ];
      discriminator: [64, 154, 185, 168, 234, 229, 218, 103];
      accounts: [
        {
          name: "solDestination";
          writable: true;
          signer: true;
        },
        {
          name: "postedVaa";
          docs: ["Posted VAA."];
        },
        {
          name: "signatureSet";
          docs: [
            "Signature set that may have been used to create the posted VAA account. If the `post_vaa_v1`",
            "instruction were used to create the posted VAA account, then the encoded signature set",
            "pubkey would be all zeroes.",
          ];
          writable: true;
        },
      ];
      args: [];
    },
  ];
  accounts: [
    {
      name: "guardianSet";
      discriminator: [16, 67, 62, 123, 169, 90, 100, 60];
    },
    {
      name: "signatureSet";
      discriminator: [135, 116, 238, 4, 218, 116, 194, 143];
    },
    {
      name: "encodedVaa";
      discriminator: [73, 170, 26, 37, 21, 245, 172, 192];
    },
  ];
  errors: [
    {
      code: 6002;
      name: "invalidInstructionArgument";
      msg: "invalidInstructionArgument";
    },
    {
      code: 6003;
      name: "accountNotZeroed";
      msg: "accountNotZeroed";
    },
    {
      code: 6004;
      name: "invalidDataConversion";
      msg: "invalidDataConversion";
    },
    {
      code: 6006;
      name: "u64Overflow";
      msg: "u64Overflow";
    },
    {
      code: 6008;
      name: "invalidComputeSize";
      msg: "invalidComputeSize";
    },
    {
      code: 6016;
      name: "invalidChain";
      msg: "invalidChain";
    },
    {
      code: 6032;
      name: "invalidGovernanceEmitter";
      msg: "invalidGovernanceEmitter";
    },
    {
      code: 6034;
      name: "invalidGovernanceAction";
      msg: "invalidGovernanceAction";
    },
    {
      code: 6036;
      name: "latestGuardianSetRequired";
      msg: "latestGuardianSetRequired";
    },
    {
      code: 6038;
      name: "governanceForAnotherChain";
      msg: "governanceForAnotherChain";
    },
    {
      code: 6040;
      name: "invalidGovernanceVaa";
      msg: "invalidGovernanceVaa";
    },
    {
      code: 6256;
      name: "insufficientFees";
      msg: "insufficientFees";
    },
    {
      code: 6258;
      name: "emitterMismatch";
      msg: "emitterMismatch";
    },
    {
      code: 6260;
      name: "notReadyForPublishing";
      msg: "notReadyForPublishing";
    },
    {
      code: 6262;
      name: "invalidPreparedMessage";
      msg: "invalidPreparedMessage";
    },
    {
      code: 6264;
      name: "executableEmitter";
      msg: "executableEmitter";
    },
    {
      code: 6266;
      name: "legacyEmitter";
      msg: "legacyEmitter";
    },
    {
      code: 6512;
      name: "invalidSignatureSet";
      msg: "invalidSignatureSet";
    },
    {
      code: 6514;
      name: "invalidMessageHash";
      msg: "invalidMessageHash";
    },
    {
      code: 6515;
      name: "noQuorum";
      msg: "noQuorum";
    },
    {
      code: 6516;
      name: "messageMismatch";
      msg: "messageMismatch";
    },
    {
      code: 7024;
      name: "notEnoughLamports";
      msg: "notEnoughLamports";
    },
    {
      code: 7026;
      name: "invalidFeeRecipient";
      msg: "invalidFeeRecipient";
    },
    {
      code: 7280;
      name: "implementationMismatch";
      msg: "implementationMismatch";
    },
    {
      code: 7536;
      name: "invalidGuardianSetIndex";
      msg: "invalidGuardianSetIndex";
    },
    {
      code: 7792;
      name: "guardianSetMismatch";
      msg: "guardianSetMismatch";
    },
    {
      code: 7794;
      name: "instructionAtWrongIndex";
      msg: "instructionAtWrongIndex";
    },
    {
      code: 7795;
      name: "emptySigVerifyInstruction";
      msg: "emptySigVerifyInstruction";
    },
    {
      code: 7796;
      name: "invalidSigVerifyInstruction";
      msg: "invalidSigVerifyInstruction";
    },
    {
      code: 7798;
      name: "guardianSetExpired";
      msg: "guardianSetExpired";
    },
    {
      code: 7800;
      name: "invalidGuardianKeyRecovery";
      msg: "invalidGuardianKeyRecovery";
    },
    {
      code: 7802;
      name: "signerIndicesMismatch";
      msg: "signerIndicesMismatch";
    },
    {
      code: 8048;
      name: "payloadSizeMismatch";
      msg: "payloadSizeMismatch";
    },
    {
      code: 10112;
      name: "zeroGuardians";
      msg: "zeroGuardians";
    },
    {
      code: 10128;
      name: "guardianZeroAddress";
      msg: "guardianZeroAddress";
    },
    {
      code: 10144;
      name: "duplicateGuardianAddress";
      msg: "duplicateGuardianAddress";
    },
    {
      code: 10160;
      name: "messageAlreadyPublished";
      msg: "messageAlreadyPublished";
    },
    {
      code: 10176;
      name: "vaaWritingDisallowed";
      msg: "vaaWritingDisallowed";
    },
    {
      code: 10192;
      name: "vaaAlreadyVerified";
      msg: "vaaAlreadyVerified";
    },
    {
      code: 10208;
      name: "invalidGuardianIndex";
      msg: "invalidGuardianIndex";
    },
    {
      code: 10224;
      name: "invalidSignature";
      msg: "invalidSignature";
    },
    {
      code: 10256;
      name: "unverifiedVaa";
      msg: "unverifiedVaa";
    },
    {
      code: 10258;
      name: "vaaStillProcessing";
      msg: "vaaStillProcessing";
    },
    {
      code: 10260;
      name: "inWritingStatus";
      msg: "inWritingStatus";
    },
    {
      code: 10262;
      name: "notInWritingStatus";
      msg: "notInWritingStatus";
    },
    {
      code: 10264;
      name: "invalidMessageStatus";
      msg: "invalidMessageStatus";
    },
    {
      code: 10266;
      name: "hashNotComputed";
      msg: "hashNotComputed";
    },
    {
      code: 10268;
      name: "invalidVaaVersion";
      msg: "invalidVaaVersion";
    },
    {
      code: 10270;
      name: "invalidCreatedAccountSize";
      msg: "invalidCreatedAccountSize";
    },
    {
      code: 10272;
      name: "dataOverflow";
      msg: "dataOverflow";
    },
    {
      code: 10274;
      name: "exceedsMaxPayloadSize";
      msg: "ExceedsMaxPayloadSize (30KB)";
    },
    {
      code: 10276;
      name: "cannotParseVaa";
      msg: "cannotParseVaa";
    },
    {
      code: 10278;
      name: "emitterAuthorityMismatch";
      msg: "emitterAuthorityMismatch";
    },
    {
      code: 10280;
      name: "invalidProgramEmitter";
      msg: "invalidProgramEmitter";
    },
    {
      code: 10282;
      name: "writeAuthorityMismatch";
      msg: "writeAuthorityMismatch";
    },
    {
      code: 10284;
      name: "postedVaaPayloadTooLarge";
      msg: "postedVaaPayloadTooLarge";
    },
    {
      code: 10286;
      name: "executableDisallowed";
      msg: "executableDisallowed";
    },
  ];
  types: [
    {
      name: "initializeArgs";
      docs: ["Arguments used to initialize the Core Bridge program."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "guardianSetTtlSeconds";
            type: "u32";
          },
          {
            name: "feeLamports";
            type: "u64";
          },
          {
            name: "initialGuardians";
            type: {
              vec: {
                array: ["u8", 20];
              };
            };
          },
        ];
      };
    },
    {
      name: "postMessageArgs";
      docs: [
        "Arguments used to post a new Wormhole (Core Bridge) message either using",
        "[post_message](crate::legacy::instruction::post_message) or",
        "[post_message_unreliable](crate::legacy::instruction::post_message_unreliable).",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "nonce";
            docs: ["Unique id for this message."];
            type: "u32";
          },
          {
            name: "payload";
            docs: ["Encoded message."];
            type: "bytes";
          },
          {
            name: "commitment";
            docs: ["Solana commitment level for Guardian observation."];
            type: {
              defined: {
                name: "commitment";
              };
            };
          },
        ];
      };
    },
    {
      name: "postVaaArgs";
      docs: [
        "Arguments to post new VAA data after signature verification.",
        "",
        "NOTE: It is preferred to use the new process of verifying a VAA using the new Core Bridge Anchor",
        "instructions. See [init_encoded_vaa](crate::wormhole_core_bridge_solana::init_encoded_vaa) and",
        "[write_encoded_vaa](crate::wormhole_core_bridge_solana::write_encoded_vaa) for more info.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "gap0";
            docs: ["Unused data."];
            type: {
              array: ["u8", 5];
            };
          },
          {
            name: "timestamp";
            docs: ["Time the message was submitted."];
            type: "u32";
          },
          {
            name: "nonce";
            docs: ["Unique ID for this message."];
            type: "u32";
          },
          {
            name: "emitterChain";
            docs: ["The Wormhole chain ID denoting the origin of this message."];
            type: "u16";
          },
          {
            name: "emitterAddress";
            docs: ["Emitter of the message."];
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "sequence";
            docs: ["Sequence number of this message."];
            type: "u64";
          },
          {
            name: "consistencyLevel";
            docs: ["Level of consistency requested by the emitter."];
            type: "u8";
          },
          {
            name: "payload";
            docs: ["Message payload."];
            type: "bytes";
          },
        ];
      };
    },
    {
      name: "verifySignaturesArgs";
      docs: [
        "Arguments to verify specific guardian indices.",
        "",
        "NOTE: It is preferred to use the new process of verifying a VAA using the new Core Bridge Anchor",
        "instructions. See [init_encoded_vaa](crate::wormhole_core_bridge_solana::init_encoded_vaa) and",
        "[write_encoded_vaa](crate::wormhole_core_bridge_solana::write_encoded_vaa) for more info.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "signerIndices";
            docs: [
              "Indices of verified guardian signatures, where -1 indicates a missing value. There is a",
              "missing value if the guardian at this index is not expected to have its signature verified by",
              "the Sig Verify native program in the instruction invoked prior).",
              "",
              "NOTE: In the legacy implementation, this argument being a fixed-sized array of 19 only",
              "allows the first 19 guardians of any size guardian set to be verified. Because of this, it",
              "is absolutely important to use the new process of verifying a VAA.",
            ];
            type: {
              array: ["i8", 19];
            };
          },
        ];
      };
    },
    {
      name: "emptyArgs";
      docs: ["Unit struct used to represent an empty instruction argument."];
      type: {
        kind: "struct";
      };
    },
    {
      name: "config";
      docs: [
        "Account used to store the current configuration of the bridge, including tracking Wormhole fee",
        "payments. For governance decrees, the guardian set index is used to determine whether a decree",
        "was attested for using the latest guardian set.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "guardianSetIndex";
            docs: ["The current guardian set index, used to decide which signature sets to accept."];
            type: "u32";
          },
          {
            name: "gap0";
            docs: [
              "Gap. In the old implementation, this was an amount that kept track of message fees that",
              "were paid to the program's fee collector.",
            ];
            type: {
              array: ["u8", 8];
            };
          },
          {
            name: "guardianSetTtl";
            docs: [
              "Period for how long a guardian set is valid after it has been replaced by a new one.  This",
              "guarantees that VAAs issued by that set can still be submitted for a certain period.  In",
              "this period we still trust the old guardian set.",
            ];
            type: {
              defined: {
                name: "duration";
              };
            };
          },
          {
            name: "feeLamports";
            docs: ["Amount of lamports that needs to be paid to the protocol to post a message"];
            type: "u64";
          },
        ];
      };
    },
    {
      name: "legacyEmitterSequence";
      docs: ["Account used to store the current sequence number for a given emitter."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "value";
            docs: ["Current sequence number, which will be used the next time this emitter publishes a message."];
            type: "u64";
          },
        ];
      };
    },
    {
      name: "emitterSequence";
      type: {
        kind: "struct";
        fields: [
          {
            name: "legacy";
            type: {
              defined: {
                name: "legacyEmitterSequence";
              };
            };
          },
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "emitterType";
            type: {
              defined: {
                name: "emitterType";
              };
            };
          },
        ];
      };
    },
    {
      name: "postedMessageV1Unreliable";
      docs: ["Account used to store a published (reusable) Wormhole message."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "data";
            type: {
              defined: {
                name: "postedMessageV1Data";
              };
            };
          },
        ];
      };
    },
    {
      name: "postedMessageV1Info";
      docs: ["Message metadata defining information about a published Wormhole message."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "consistencyLevel";
            docs: ["Level of consistency requested by the emitter."];
            type: "u8";
          },
          {
            name: "emitterAuthority";
            docs: ["Authority used to write the message. This field is set to default when the message is", "posted."];
            type: "pubkey";
          },
          {
            name: "status";
            docs: [
              "If a message is being written to, this status is used to determine which state this",
              "account is in (e.g. [MessageStatus::Writing] indicates that the emitter authority is still",
              "writing its message to this account). When this message is posted, this value will be",
              "set to [MessageStatus::Published].",
            ];
            type: {
              defined: {
                name: "messageStatus";
              };
            };
          },
          {
            name: "gap0";
            docs: ["No data is stored here."];
            type: {
              array: ["u8", 3];
            };
          },
          {
            name: "postedTimestamp";
            docs: ["Time the posted message was created."];
            type: {
              defined: {
                name: "timestamp";
              };
            };
          },
          {
            name: "nonce";
            docs: ["Unique id for this message."];
            type: "u32";
          },
          {
            name: "sequence";
            docs: ["Sequence number of this message."];
            type: "u64";
          },
          {
            name: "solanaChainId";
            docs: [
              "Always `1`.",
              "",
              "NOTE: Saving this value is silly, but we are keeping it to be consistent with how the posted",
              "message account is written.",
            ];
            type: {
              defined: {
                name: "chainIdSolanaOnly";
              };
            };
          },
          {
            name: "emitter";
            docs: ["Emitter of the message. This may either be the emitter authority or a program ID."];
            type: "pubkey";
          },
        ];
      };
    },
    {
      name: "postedMessageV1Data";
      docs: [
        "Underlying data for either [PostedMessageV1](crate::legacy::state::PostedMessageV1) or",
        "[PostedMessageV1Unreliable](crate::legacy::state::PostedMessageV1Unreliable).",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "info";
            docs: ["Message metadata."];
            type: {
              defined: {
                name: "postedMessageV1Info";
              };
            };
          },
          {
            name: "payload";
            docs: ["Encoded message."];
            type: "bytes";
          },
        ];
      };
    },
    {
      name: "postedMessageV1";
      docs: [
        "Account used to store a published Wormhole message.",
        "",
        "NOTE: If your integration requires reusable message accounts, please see",
        "[PostedMessageV1Unreliable](crate::legacy::state::PostedMessageV1Unreliable).",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "data";
            docs: ["Message data."];
            type: {
              defined: {
                name: "postedMessageV1Data";
              };
            };
          },
        ];
      };
    },
    {
      name: "postedVaaV1Info";
      docs: ["VAA metadata defining information about a Wormhole message attested for by an active guardian", "set."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "consistencyLevel";
            docs: ["Level of consistency requested by the emitter."];
            type: "u8";
          },
          {
            name: "timestamp";
            docs: ["Time the message was submitted."];
            type: {
              defined: {
                name: "timestamp";
              };
            };
          },
          {
            name: "signatureSet";
            docs: [
              "Pubkey of [SignatureSet](crate::state::SignatureSet) account that represents this VAA's",
              "signature verification.",
            ];
            type: "pubkey";
          },
          {
            name: "guardianSetIndex";
            docs: [
              "Guardian set index used to verify signatures for [SignatureSet](crate::state::SignatureSet).",
              "",
              'NOTE: In the previous implementation, this member was referred to as the "posted timestamp",',
              "which is zero for VAA data (posted messages and VAAs resemble the same account schema). By",
              "changing this to the guardian set index, we patch a bug with verifying governance VAAs for",
              "the Core Bridge (other Core Bridge implementations require that the guardian set that",
              "attested for the governance VAA is the current one).",
            ];
            type: "u32";
          },
          {
            name: "nonce";
            docs: ["Unique ID for this message."];
            type: "u32";
          },
          {
            name: "sequence";
            docs: ["Sequence number of this message."];
            type: "u64";
          },
          {
            name: "emitterChain";
            docs: ["The Wormhole chain ID denoting the origin of this message."];
            type: "u16";
          },
          {
            name: "emitterAddress";
            docs: ["Emitter of the message."];
            type: {
              array: ["u8", 32];
            };
          },
        ];
      };
    },
    {
      name: "postedVaaV1";
      docs: ["Account used to store a verified VAA."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "info";
            docs: ["VAA metadata."];
            type: {
              defined: {
                name: "postedVaaV1Info";
              };
            };
          },
          {
            name: "payload";
            docs: ["Message payload."];
            type: "bytes";
          },
        ];
      };
    },
    {
      name: "writeEncodedVaaArgs";
      docs: [
        "Arguments for the [write_encoded_vaa](crate::wormhole_core_bridge_solana::write_encoded_vaa)",
        "instruction.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "index";
            docs: ["Index of VAA buffer."];
            type: "u32";
          },
          {
            name: "data";
            docs: ["Data representing subset of VAA buffer starting at specified index."];
            type: "bytes";
          },
        ];
      };
    },
    {
      name: "initMessageV1Args";
      docs: [
        "Arguments for the [init_message_v1](crate::wormhole_core_bridge_solana::init_message_v1)",
        "instruction.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "nonce";
            docs: ["Unique id for this message."];
            type: "u32";
          },
          {
            name: "commitment";
            docs: ["Solana commitment level for Guardian observation."];
            type: {
              defined: {
                name: "commitment";
              };
            };
          },
          {
            name: "cpiProgramId";
            docs: [
              "Optional program ID if the emitter address will be your program ID.",
              "",
              'NOTE: If `Some(program_id)`, your emitter authority seeds to be \\[b"emitter\\].',
            ];
            type: {
              option: "pubkey";
            };
          },
        ];
      };
    },
    {
      name: "writeMessageV1Args";
      docs: [
        "Arguments for the [write_message_v1](crate::wormhole_core_bridge_solana::write_message_v1)",
        "instruction.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "index";
            docs: ["Index of message buffer."];
            type: "u32";
          },
          {
            name: "data";
            docs: ["Data representing subset of message buffer starting at specified index."];
            type: "bytes";
          },
        ];
      };
    },
    {
      name: "header";
      docs: ["`EncodedVaa` account header."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "status";
            docs: [
              "Processing status. **This encoded VAA is only considered usable when this status is set",
              "to [Verified](ProcessingStatus::Verified).**",
            ];
            type: {
              defined: {
                name: "processingStatus";
              };
            };
          },
          {
            name: "writeAuthority";
            docs: ["The authority that has write privilege to this account."];
            type: "pubkey";
          },
          {
            name: "version";
            docs: ["VAA version. Only when the VAA is verified is this version set to a value."];
            type: "u8";
          },
        ];
      };
    },
    {
      name: "timestamp";
      docs: [
        "This struct defines unix timestamp as u32 (as opposed to more modern systems that have adopted",
        "i64). Methods for this struct are meant to convert Solana's clock type to this type assuming we",
        "are far from year 2038.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "value";
            type: "u32";
          },
        ];
      };
    },
    {
      name: "duration";
      docs: ["To be used with the [Timestamp] type, this struct defines a duration in seconds."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "seconds";
            type: "u32";
          },
        ];
      };
    },
    {
      name: "messageHash";
      docs: ["This type is used to represent a message hash (keccak)."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "bytes";
            type: {
              array: ["u8", 32];
            };
          },
        ];
      };
    },
    {
      name: "chainIdSolanaOnly";
      docs: [
        "This type is kind of silly. But because [PostedMessageV1](crate::state::PostedMessageV1) has the",
        "emitter chain ID as a field, which is unnecessary since it is always Solana's chain ID, we use",
        "this type to guarantee that the encoded chain ID is always `1`.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "chainId";
            type: "u16";
          },
        ];
      };
    },
    {
      name: "emitterInfo";
      type: {
        kind: "struct";
        fields: [
          {
            name: "chain";
            type: "u16";
          },
          {
            name: "address";
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "sequence";
            type: "u64";
          },
        ];
      };
    },
    {
      name: "legacyInstruction";
      docs: [
        "Legacy instruction selector.",
        "",
        "NOTE: No more instructions should be added to this enum. Instead, add them as Anchor instruction",
        "handlers, which will inevitably live in",
        "[wormhole_core_bridge_solana](crate::wormhole_core_bridge_solana).",
      ];
      type: {
        kind: "enum";
        variants: [
          {
            name: "initialize";
          },
          {
            name: "postMessage";
          },
          {
            name: "postVaa";
          },
          {
            name: "setMessageFee";
          },
          {
            name: "transferFees";
          },
          {
            name: "upgradeContract";
          },
          {
            name: "guardianSetUpdate";
          },
          {
            name: "verifySignatures";
          },
          {
            name: "postMessageUnreliable";
          },
        ];
      };
    },
    {
      name: "emitterType";
      type: {
        kind: "enum";
        variants: [
          {
            name: "unset";
          },
          {
            name: "legacy";
          },
          {
            name: "executable";
          },
        ];
      };
    },
    {
      name: "messageStatus";
      docs: ["Status of a message. When a message is posted, its status is", "[Published](MessageStatus::Published)."];
      type: {
        kind: "enum";
        variants: [
          {
            name: "published";
          },
          {
            name: "writing";
          },
          {
            name: "readyForPublishing";
          },
        ];
      };
    },
    {
      name: "publishMessageDirective";
      docs: ["Directive used to determine how to post a Core Bridge message."];
      type: {
        kind: "enum";
        variants: [
          {
            name: "message";
            fields: [
              {
                name: "nonce";
                type: "u32";
              },
              {
                name: "payload";
                type: "bytes";
              },
              {
                name: "commitment";
                type: {
                  defined: {
                    name: "commitment";
                  };
                };
              },
            ];
          },
          {
            name: "programMessage";
            fields: [
              {
                name: "programId";
                type: "pubkey";
              },
              {
                name: "nonce";
                type: "u32";
              },
              {
                name: "payload";
                type: "bytes";
              },
              {
                name: "commitment";
                type: {
                  defined: {
                    name: "commitment";
                  };
                };
              },
            ];
          },
          {
            name: "preparedMessage";
          },
        ];
      };
    },
    {
      name: "processingStatus";
      docs: ["Encoded VAA's processing status."];
      type: {
        kind: "enum";
        variants: [
          {
            name: "unset";
          },
          {
            name: "writing";
          },
          {
            name: "verified";
          },
        ];
      };
    },
    {
      name: "commitment";
      docs: [
        "Representation of Solana's commitment levels. This enum is not exhaustive because Wormhole only",
        "considers these two commitment levels in its Guardian observation.",
        "",
        "See <https://docs.solana.com/cluster/commitments> for more info.",
      ];
      type: {
        kind: "enum";
        variants: [
          {
            name: "confirmed";
          },
          {
            name: "finalized";
          },
        ];
      };
    },
    {
      name: "guardianSet";
      docs: [
        "Account used to store a guardian set. The keys encoded in this account are Ethereum pubkeys.",
        "Its expiration time is determined at the time a guardian set is updated to a new set, where the",
        "current network clock time is used with",
        "[guardian_set_ttl](crate::state::Config::guardian_set_ttl).",
        "",
        "NOTE: The account schema is the same as legacy guardian sets, but this account now has a",
        "discriminator generated by Anchor's [account] macro. When the Core Bridge program performs a",
        "guardian set update with this implementation, guardian sets will now have this Anchor-generated",
        "discriminator.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "index";
            docs: ["Index representing an incrementing version number for this guardian set."];
            type: "u32";
          },
          {
            name: "keys";
            docs: ["Ethereum-style public keys."];
            type: {
              vec: {
                array: ["u8", 20];
              };
            };
          },
          {
            name: "creationTime";
            docs: ["Timestamp representing the time this guardian became active."];
            type: {
              defined: {
                name: "timestamp";
              };
            };
          },
          {
            name: "expirationTime";
            docs: ["Expiration time when VAAs issued by this set are no longer valid."];
            type: {
              defined: {
                name: "timestamp";
              };
            };
          },
        ];
      };
    },
    {
      name: "signatureSet";
      docs: [
        "Account used to store information about a guardian set used to sign a VAA. There is only one",
        "signature set for each verified VAA (associated with a",
        "[PostedVaaV1](crate::legacy::state::PostedVaaV1) account). This account is created using the",
        "verify signatures legacy instruction.",
        "",
        "NOTE: The account schema is the same as legacy signature sets, but this account now has a",
        "discriminator generated by Anchor's [account] macro. When the Core Bridge program upgrades to",
        "this implementation from the old one, integrators in the middle of verifying signatures will",
        "have to use a new keypair for this account and try again.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "sigVerifySuccesses";
            docs: ["Signatures of validators"];
            type: {
              vec: "bool";
            };
          },
          {
            name: "messageHash";
            docs: ["Hash of the VAA message body."];
            type: {
              defined: {
                name: "messageHash";
              };
            };
          },
          {
            name: "guardianSetIndex";
            docs: ["Index of the guardian set"];
            type: "u32";
          },
        ];
      };
    },
    {
      name: "encodedVaa";
      docs: [
        "Account used to warehouse VAA buffer.",
        "",
        "NOTE: This account should not be used by an external application unless the header's status is",
        "`Verified`. It is encouraged to use the `EncodedVaa` zero-copy account struct instead.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "header";
            docs: ["Status, write authority and VAA version."];
            type: {
              defined: {
                name: "header";
              };
            };
          },
          {
            name: "buf";
            docs: ["VAA buffer."];
            type: "bytes";
          },
        ];
      };
    },
  ];
  constants: [
    {
      name: "solanaChain";
      type: "u16";
      value: "1";
    },
    {
      name: "feeCollectorSeedPrefix";
      type: "bytes";
      value: "[102, 101, 101, 95, 99, 111, 108, 108, 101, 99, 116, 111, 114]";
    },
    {
      name: "upgradeSeedPrefix";
      type: "bytes";
      value: "[117, 112, 103, 114, 97, 100, 101]";
    },
    {
      name: "programEmitterSeedPrefix";
      type: "bytes";
      value: "[101, 109, 105, 116, 116, 101, 114]";
    },
    {
      name: "maxMessagePayloadSize";
      type: {
        defined: {
          name: "usize";
        };
      };
      value: "30 * 1_024";
    },
  ];
};

export const PYTH_WORMHOLE_IDL: WormholeCoreBridgeSolana = {
  address: "HDwcJBJXjL9FpJ7UBsYBtaDjsBUhuLCUYoz3zr8SWWaQ",
  metadata: {
    name: "wormholeCoreBridgeSolana",
    version: "0.0.1-alpha.5",
    spec: "0.1.0",
  },
  instructions: [
    {
      name: "initMessageV1",
      docs: [
        "Processor for initializing a new draft [PostedMessageV1](crate::state::PostedMessageV1)",
        "account for writing. The emitter authority is established at this point and the payload size",
        "is inferred from the size of the created account. This instruction handler also allows an",
        "integrator to publish Wormhole messages using his program's ID as the emitter address",
        "(by passing `Some(crate::ID)` to the [cpi_program_id](InitMessageV1Args::cpi_program_id)",
        'argument). **Be aware that the emitter authority\'s seeds must only be \\[b"emitter"\\] in this',
        "case.**",
        "",
        "This instruction should be followed up with `write_message_v1` and `finalize_message_v1` to",
        "write and indicate that the message is ready for publishing respectively (to prepare it for",
        "publishing via the",
        "[post message instruction](crate::legacy::instruction::LegacyInstruction::PostMessage)).",
        "",
        "NOTE: If you wish to publish a small message (one where the data does not overflow the",
        "Solana transaction size), it is recommended that you use an [sdk](crate::sdk::cpi) method to",
        "either prepare your message or post a message as a program ID emitter.",
      ],
      discriminator: [247, 187, 26, 16, 122, 198, 106, 247],
      accounts: [
        {
          name: "emitterAuthority",
          docs: ["This authority is the only one who can write to the draft message account."],
          signer: true,
        },
        {
          name: "draftMessage",
          docs: ["Bridge."],
          writable: true,
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "initMessageV1Args",
            },
          },
        },
      ],
    },
    {
      name: "writeMessageV1",
      docs: [
        "Processor used to write to a draft [PostedMessageV1](crate::state::PostedMessageV1) account.",
        "This instruction requires an authority (the emitter authority) to interact with the message",
        "account.",
      ],
      discriminator: [35, 67, 197, 233, 94, 117, 124, 143],
      accounts: [
        {
          name: "emitterAuthority",
          signer: true,
        },
        {
          name: "draftMessage",
          docs: ["only be published when the message is finalized."],
          writable: true,
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "writeMessageV1Args",
            },
          },
        },
      ],
    },
    {
      name: "finalizeMessageV1",
      docs: [
        "Processor used to finalize a draft [PostedMessageV1](crate::state::PostedMessageV1) account.",
        "Once finalized, this message account cannot be written to again. A finalized message is the",
        "only state the legacy post message instruction can accept before publishing. This",
        "instruction requires an authority (the emitter authority) to interact with the message",
        "account.",
      ],
      discriminator: [245, 208, 215, 228, 129, 56, 51, 251],
      accounts: [
        {
          name: "emitterAuthority",
          signer: true,
        },
        {
          name: "draftMessage",
          docs: ["only be published when the message is finalized."],
          writable: true,
        },
      ],
      args: [],
    },
    {
      name: "closeMessageV1",
      docs: [
        "Processor used to process a draft [PostedMessageV1](crate::state::PostedMessageV1) account.",
        "This instruction requires an authority (the emitter authority) to interact with the message",
        "account.",
      ],
      discriminator: [36, 185, 40, 107, 239, 13, 51, 162],
      accounts: [
        {
          name: "emitterAuthority",
          signer: true,
        },
        {
          name: "draftMessage",
          docs: ["only be published when the message is finalized."],
          writable: true,
        },
        {
          name: "closeAccountDestination",
          writable: true,
        },
      ],
      args: [],
    },
    {
      name: "initEncodedVaa",
      docs: [
        "Processor used to intialize a created account as [EncodedVaa](crate::state::EncodedVaa). An",
        "authority (the write authority) is established with this instruction.",
      ],
      discriminator: [209, 193, 173, 25, 91, 202, 181, 218],
      accounts: [
        {
          name: "writeAuthority",
          docs: ["The authority who can write to the VAA account when it is being processed."],
          signer: true,
        },
        {
          name: "encodedVaa",
          docs: ["Bridge."],
          writable: true,
        },
      ],
      args: [],
    },
    {
      name: "closeEncodedVaa",
      docs: [
        "Processor used to close an [EncodedVaa](crate::state::EncodedVaa). This instruction requires",
        "an authority (the write authority) to interact witht he encoded VAA account.",
      ],
      discriminator: [48, 221, 174, 198, 231, 7, 152, 38],
      accounts: [
        {
          name: "writeAuthority",
          docs: [
            "This account is only required to be mutable for the `CloseVaaAccount` directive. This",
            "authority is the same signer that originally created the VAA accounts, so he is the one that",
            "will receive the lamports back for the closed accounts.",
          ],
          writable: true,
          signer: true,
        },
        {
          name: "encodedVaa",
          docs: ["written to and then verified."],
          writable: true,
        },
      ],
      args: [],
    },
    {
      name: "writeEncodedVaa",
      docs: [
        "Processor used to write to an [EncodedVaa](crate::state::EncodedVaa) account. This",
        "instruction requires an authority (the write authority) to interact with the encoded VAA",
        "account.",
      ],
      discriminator: [199, 208, 110, 177, 150, 76, 118, 42],
      accounts: [
        {
          name: "writeAuthority",
          docs: ["The only authority that can write to the encoded VAA account."],
          signer: true,
        },
        {
          name: "draftVaa",
          docs: ["written to and then verified."],
          writable: true,
        },
      ],
      args: [
        {
          name: "args",
          type: {
            defined: {
              name: "writeEncodedVaaArgs",
            },
          },
        },
      ],
    },
    {
      name: "verifyEncodedVaaV1",
      docs: [
        "Processor used to verify an [EncodedVaa](crate::state::EncodedVaa) account as a version 1",
        "VAA (guardian signatures attesting to this observation). This instruction requires an",
        "authority (the write authority) to interact with the encoded VAA account.",
      ],
      discriminator: [103, 56, 177, 229, 240, 103, 68, 73],
      accounts: [
        {
          name: "writeAuthority",
          signer: true,
        },
        {
          name: "draftVaa",
          docs: ["written to and then verified."],
          writable: true,
        },
        {
          name: "guardianSet",
          docs: [
            "Guardian set account, which should be the same one that was used to attest for the VAA. The",
            "signatures in the encoded VAA are verified against this guardian set.",
          ],
        },
      ],
      args: [],
    },
    {
      name: "postVaaV1",
      docs: [
        "Processor used to close an [EncodedVaa](crate::state::EncodedVaa) account to create a",
        "[PostedMessageV1](crate::state::PostedMessageV1) account in its place.",
        "",
        "NOTE: Because the legacy verify signatures instruction was not required for the Posted VAA",
        "account to exist, the encoded [SignatureSet](crate::state::SignatureSet) is the default",
        "[Pubkey].",
      ],
      discriminator: [0, 57, 97, 3, 225, 37, 254, 31],
      accounts: [
        {
          name: "payer",
          docs: [
            "Payer to create the posted VAA account. This instruction allows anyone with an encoded VAA",
            "to create a posted VAA account.",
          ],
          writable: true,
          signer: true,
        },
        {
          name: "encodedVaa",
          docs: [
            "Encoded VAA, whose body will be serialized into the posted VAA account.",
            "",
            "NOTE: This instruction handler only exists to support integrators that still rely on posted",
            "VAA accounts. While we encourage integrators to use the encoded VAA account instead, we",
            "allow a pathway to convert the encoded VAA into a posted VAA. However, the payload is",
            "restricted to 9.5KB, which is much larger than what was possible with the old implementation",
            "using the legacy post vaa instruction. The Core Bridge program will not support posting VAAs",
            "larger than this payload size.",
          ],
        },
        {
          name: "postedVaa",
          writable: true,
        },
        {
          name: "systemProgram",
        },
      ],
      args: [],
    },
    {
      name: "closeSignatureSet",
      docs: [
        "Processor used to close a [SignatureSet](crate::state::SignatureSet), which was used to",
        "verify the VAA using the legacy parse and verify procedure.",
      ],
      discriminator: [64, 154, 185, 168, 234, 229, 218, 103],
      accounts: [
        {
          name: "solDestination",
          writable: true,
          signer: true,
        },
        {
          name: "postedVaa",
          docs: ["Posted VAA."],
        },
        {
          name: "signatureSet",
          docs: [
            "Signature set that may have been used to create the posted VAA account. If the `post_vaa_v1`",
            "instruction were used to create the posted VAA account, then the encoded signature set",
            "pubkey would be all zeroes.",
          ],
          writable: true,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "guardianSet",
      discriminator: [16, 67, 62, 123, 169, 90, 100, 60],
    },
    {
      name: "signatureSet",
      discriminator: [135, 116, 238, 4, 218, 116, 194, 143],
    },
    {
      name: "encodedVaa",
      discriminator: [73, 170, 26, 37, 21, 245, 172, 192],
    },
  ],
  errors: [
    {
      code: 6002,
      name: "invalidInstructionArgument",
      msg: "invalidInstructionArgument",
    },
    {
      code: 6003,
      name: "accountNotZeroed",
      msg: "accountNotZeroed",
    },
    {
      code: 6004,
      name: "invalidDataConversion",
      msg: "invalidDataConversion",
    },
    {
      code: 6006,
      name: "u64Overflow",
      msg: "u64Overflow",
    },
    {
      code: 6008,
      name: "invalidComputeSize",
      msg: "invalidComputeSize",
    },
    {
      code: 6016,
      name: "invalidChain",
      msg: "invalidChain",
    },
    {
      code: 6032,
      name: "invalidGovernanceEmitter",
      msg: "invalidGovernanceEmitter",
    },
    {
      code: 6034,
      name: "invalidGovernanceAction",
      msg: "invalidGovernanceAction",
    },
    {
      code: 6036,
      name: "latestGuardianSetRequired",
      msg: "latestGuardianSetRequired",
    },
    {
      code: 6038,
      name: "governanceForAnotherChain",
      msg: "governanceForAnotherChain",
    },
    {
      code: 6040,
      name: "invalidGovernanceVaa",
      msg: "invalidGovernanceVaa",
    },
    {
      code: 6256,
      name: "insufficientFees",
      msg: "insufficientFees",
    },
    {
      code: 6258,
      name: "emitterMismatch",
      msg: "emitterMismatch",
    },
    {
      code: 6260,
      name: "notReadyForPublishing",
      msg: "notReadyForPublishing",
    },
    {
      code: 6262,
      name: "invalidPreparedMessage",
      msg: "invalidPreparedMessage",
    },
    {
      code: 6264,
      name: "executableEmitter",
      msg: "executableEmitter",
    },
    {
      code: 6266,
      name: "legacyEmitter",
      msg: "legacyEmitter",
    },
    {
      code: 6512,
      name: "invalidSignatureSet",
      msg: "invalidSignatureSet",
    },
    {
      code: 6514,
      name: "invalidMessageHash",
      msg: "invalidMessageHash",
    },
    {
      code: 6515,
      name: "noQuorum",
      msg: "noQuorum",
    },
    {
      code: 6516,
      name: "messageMismatch",
      msg: "messageMismatch",
    },
    {
      code: 7024,
      name: "notEnoughLamports",
      msg: "notEnoughLamports",
    },
    {
      code: 7026,
      name: "invalidFeeRecipient",
      msg: "invalidFeeRecipient",
    },
    {
      code: 7280,
      name: "implementationMismatch",
      msg: "implementationMismatch",
    },
    {
      code: 7536,
      name: "invalidGuardianSetIndex",
      msg: "invalidGuardianSetIndex",
    },
    {
      code: 7792,
      name: "guardianSetMismatch",
      msg: "guardianSetMismatch",
    },
    {
      code: 7794,
      name: "instructionAtWrongIndex",
      msg: "instructionAtWrongIndex",
    },
    {
      code: 7795,
      name: "emptySigVerifyInstruction",
      msg: "emptySigVerifyInstruction",
    },
    {
      code: 7796,
      name: "invalidSigVerifyInstruction",
      msg: "invalidSigVerifyInstruction",
    },
    {
      code: 7798,
      name: "guardianSetExpired",
      msg: "guardianSetExpired",
    },
    {
      code: 7800,
      name: "invalidGuardianKeyRecovery",
      msg: "invalidGuardianKeyRecovery",
    },
    {
      code: 7802,
      name: "signerIndicesMismatch",
      msg: "signerIndicesMismatch",
    },
    {
      code: 8048,
      name: "payloadSizeMismatch",
      msg: "payloadSizeMismatch",
    },
    {
      code: 10112,
      name: "zeroGuardians",
      msg: "zeroGuardians",
    },
    {
      code: 10128,
      name: "guardianZeroAddress",
      msg: "guardianZeroAddress",
    },
    {
      code: 10144,
      name: "duplicateGuardianAddress",
      msg: "duplicateGuardianAddress",
    },
    {
      code: 10160,
      name: "messageAlreadyPublished",
      msg: "messageAlreadyPublished",
    },
    {
      code: 10176,
      name: "vaaWritingDisallowed",
      msg: "vaaWritingDisallowed",
    },
    {
      code: 10192,
      name: "vaaAlreadyVerified",
      msg: "vaaAlreadyVerified",
    },
    {
      code: 10208,
      name: "invalidGuardianIndex",
      msg: "invalidGuardianIndex",
    },
    {
      code: 10224,
      name: "invalidSignature",
      msg: "invalidSignature",
    },
    {
      code: 10256,
      name: "unverifiedVaa",
      msg: "unverifiedVaa",
    },
    {
      code: 10258,
      name: "vaaStillProcessing",
      msg: "vaaStillProcessing",
    },
    {
      code: 10260,
      name: "inWritingStatus",
      msg: "inWritingStatus",
    },
    {
      code: 10262,
      name: "notInWritingStatus",
      msg: "notInWritingStatus",
    },
    {
      code: 10264,
      name: "invalidMessageStatus",
      msg: "invalidMessageStatus",
    },
    {
      code: 10266,
      name: "hashNotComputed",
      msg: "hashNotComputed",
    },
    {
      code: 10268,
      name: "invalidVaaVersion",
      msg: "invalidVaaVersion",
    },
    {
      code: 10270,
      name: "invalidCreatedAccountSize",
      msg: "invalidCreatedAccountSize",
    },
    {
      code: 10272,
      name: "dataOverflow",
      msg: "dataOverflow",
    },
    {
      code: 10274,
      name: "exceedsMaxPayloadSize",
      msg: "ExceedsMaxPayloadSize (30KB)",
    },
    {
      code: 10276,
      name: "cannotParseVaa",
      msg: "cannotParseVaa",
    },
    {
      code: 10278,
      name: "emitterAuthorityMismatch",
      msg: "emitterAuthorityMismatch",
    },
    {
      code: 10280,
      name: "invalidProgramEmitter",
      msg: "invalidProgramEmitter",
    },
    {
      code: 10282,
      name: "writeAuthorityMismatch",
      msg: "writeAuthorityMismatch",
    },
    {
      code: 10284,
      name: "postedVaaPayloadTooLarge",
      msg: "postedVaaPayloadTooLarge",
    },
    {
      code: 10286,
      name: "executableDisallowed",
      msg: "executableDisallowed",
    },
  ],
  types: [
    {
      name: "initializeArgs",
      docs: ["Arguments used to initialize the Core Bridge program."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "guardianSetTtlSeconds",
            type: "u32",
          },
          {
            name: "feeLamports",
            type: "u64",
          },
          {
            name: "initialGuardians",
            type: {
              vec: {
                array: ["u8", 20],
              },
            },
          },
        ],
      },
    },
    {
      name: "postMessageArgs",
      docs: [
        "Arguments used to post a new Wormhole (Core Bridge) message either using",
        "[post_message](crate::legacy::instruction::post_message) or",
        "[post_message_unreliable](crate::legacy::instruction::post_message_unreliable).",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "nonce",
            docs: ["Unique id for this message."],
            type: "u32",
          },
          {
            name: "payload",
            docs: ["Encoded message."],
            type: "bytes",
          },
          {
            name: "commitment",
            docs: ["Solana commitment level for Guardian observation."],
            type: {
              defined: {
                name: "commitment",
              },
            },
          },
        ],
      },
    },
    {
      name: "postVaaArgs",
      docs: [
        "Arguments to post new VAA data after signature verification.",
        "",
        "NOTE: It is preferred to use the new process of verifying a VAA using the new Core Bridge Anchor",
        "instructions. See [init_encoded_vaa](crate::wormhole_core_bridge_solana::init_encoded_vaa) and",
        "[write_encoded_vaa](crate::wormhole_core_bridge_solana::write_encoded_vaa) for more info.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "gap0",
            docs: ["Unused data."],
            type: {
              array: ["u8", 5],
            },
          },
          {
            name: "timestamp",
            docs: ["Time the message was submitted."],
            type: "u32",
          },
          {
            name: "nonce",
            docs: ["Unique ID for this message."],
            type: "u32",
          },
          {
            name: "emitterChain",
            docs: ["The Wormhole chain ID denoting the origin of this message."],
            type: "u16",
          },
          {
            name: "emitterAddress",
            docs: ["Emitter of the message."],
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "sequence",
            docs: ["Sequence number of this message."],
            type: "u64",
          },
          {
            name: "consistencyLevel",
            docs: ["Level of consistency requested by the emitter."],
            type: "u8",
          },
          {
            name: "payload",
            docs: ["Message payload."],
            type: "bytes",
          },
        ],
      },
    },
    {
      name: "verifySignaturesArgs",
      docs: [
        "Arguments to verify specific guardian indices.",
        "",
        "NOTE: It is preferred to use the new process of verifying a VAA using the new Core Bridge Anchor",
        "instructions. See [init_encoded_vaa](crate::wormhole_core_bridge_solana::init_encoded_vaa) and",
        "[write_encoded_vaa](crate::wormhole_core_bridge_solana::write_encoded_vaa) for more info.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "signerIndices",
            docs: [
              "Indices of verified guardian signatures, where -1 indicates a missing value. There is a",
              "missing value if the guardian at this index is not expected to have its signature verified by",
              "the Sig Verify native program in the instruction invoked prior).",
              "",
              "NOTE: In the legacy implementation, this argument being a fixed-sized array of 19 only",
              "allows the first 19 guardians of any size guardian set to be verified. Because of this, it",
              "is absolutely important to use the new process of verifying a VAA.",
            ],
            type: {
              array: ["i8", 19],
            },
          },
        ],
      },
    },
    {
      name: "emptyArgs",
      docs: ["Unit struct used to represent an empty instruction argument."],
      type: {
        kind: "struct",
      },
    },
    {
      name: "config",
      docs: [
        "Account used to store the current configuration of the bridge, including tracking Wormhole fee",
        "payments. For governance decrees, the guardian set index is used to determine whether a decree",
        "was attested for using the latest guardian set.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "guardianSetIndex",
            docs: ["The current guardian set index, used to decide which signature sets to accept."],
            type: "u32",
          },
          {
            name: "gap0",
            docs: [
              "Gap. In the old implementation, this was an amount that kept track of message fees that",
              "were paid to the program's fee collector.",
            ],
            type: {
              array: ["u8", 8],
            },
          },
          {
            name: "guardianSetTtl",
            docs: [
              "Period for how long a guardian set is valid after it has been replaced by a new one.  This",
              "guarantees that VAAs issued by that set can still be submitted for a certain period.  In",
              "this period we still trust the old guardian set.",
            ],
            type: {
              defined: {
                name: "duration",
              },
            },
          },
          {
            name: "feeLamports",
            docs: ["Amount of lamports that needs to be paid to the protocol to post a message"],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "legacyEmitterSequence",
      docs: ["Account used to store the current sequence number for a given emitter."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "value",
            docs: ["Current sequence number, which will be used the next time this emitter publishes a message."],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "emitterSequence",
      type: {
        kind: "struct",
        fields: [
          {
            name: "legacy",
            type: {
              defined: {
                name: "legacyEmitterSequence",
              },
            },
          },
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "emitterType",
            type: {
              defined: {
                name: "emitterType",
              },
            },
          },
        ],
      },
    },
    {
      name: "postedMessageV1Unreliable",
      docs: ["Account used to store a published (reusable) Wormhole message."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "data",
            type: {
              defined: {
                name: "postedMessageV1Data",
              },
            },
          },
        ],
      },
    },
    {
      name: "postedMessageV1Info",
      docs: ["Message metadata defining information about a published Wormhole message."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "consistencyLevel",
            docs: ["Level of consistency requested by the emitter."],
            type: "u8",
          },
          {
            name: "emitterAuthority",
            docs: ["Authority used to write the message. This field is set to default when the message is", "posted."],
            type: "pubkey",
          },
          {
            name: "status",
            docs: [
              "If a message is being written to, this status is used to determine which state this",
              "account is in (e.g. [MessageStatus::Writing] indicates that the emitter authority is still",
              "writing its message to this account). When this message is posted, this value will be",
              "set to [MessageStatus::Published].",
            ],
            type: {
              defined: {
                name: "messageStatus",
              },
            },
          },
          {
            name: "gap0",
            docs: ["No data is stored here."],
            type: {
              array: ["u8", 3],
            },
          },
          {
            name: "postedTimestamp",
            docs: ["Time the posted message was created."],
            type: {
              defined: {
                name: "timestamp",
              },
            },
          },
          {
            name: "nonce",
            docs: ["Unique id for this message."],
            type: "u32",
          },
          {
            name: "sequence",
            docs: ["Sequence number of this message."],
            type: "u64",
          },
          {
            name: "solanaChainId",
            docs: [
              "Always `1`.",
              "",
              "NOTE: Saving this value is silly, but we are keeping it to be consistent with how the posted",
              "message account is written.",
            ],
            type: {
              defined: {
                name: "chainIdSolanaOnly",
              },
            },
          },
          {
            name: "emitter",
            docs: ["Emitter of the message. This may either be the emitter authority or a program ID."],
            type: "pubkey",
          },
        ],
      },
    },
    {
      name: "postedMessageV1Data",
      docs: [
        "Underlying data for either [PostedMessageV1](crate::legacy::state::PostedMessageV1) or",
        "[PostedMessageV1Unreliable](crate::legacy::state::PostedMessageV1Unreliable).",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "info",
            docs: ["Message metadata."],
            type: {
              defined: {
                name: "postedMessageV1Info",
              },
            },
          },
          {
            name: "payload",
            docs: ["Encoded message."],
            type: "bytes",
          },
        ],
      },
    },
    {
      name: "postedMessageV1",
      docs: [
        "Account used to store a published Wormhole message.",
        "",
        "NOTE: If your integration requires reusable message accounts, please see",
        "[PostedMessageV1Unreliable](crate::legacy::state::PostedMessageV1Unreliable).",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "data",
            docs: ["Message data."],
            type: {
              defined: {
                name: "postedMessageV1Data",
              },
            },
          },
        ],
      },
    },
    {
      name: "postedVaaV1Info",
      docs: ["VAA metadata defining information about a Wormhole message attested for by an active guardian", "set."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "consistencyLevel",
            docs: ["Level of consistency requested by the emitter."],
            type: "u8",
          },
          {
            name: "timestamp",
            docs: ["Time the message was submitted."],
            type: {
              defined: {
                name: "timestamp",
              },
            },
          },
          {
            name: "signatureSet",
            docs: [
              "Pubkey of [SignatureSet](crate::state::SignatureSet) account that represents this VAA's",
              "signature verification.",
            ],
            type: "pubkey",
          },
          {
            name: "guardianSetIndex",
            docs: [
              "Guardian set index used to verify signatures for [SignatureSet](crate::state::SignatureSet).",
              "",
              'NOTE: In the previous implementation, this member was referred to as the "posted timestamp",',
              "which is zero for VAA data (posted messages and VAAs resemble the same account schema). By",
              "changing this to the guardian set index, we patch a bug with verifying governance VAAs for",
              "the Core Bridge (other Core Bridge implementations require that the guardian set that",
              "attested for the governance VAA is the current one).",
            ],
            type: "u32",
          },
          {
            name: "nonce",
            docs: ["Unique ID for this message."],
            type: "u32",
          },
          {
            name: "sequence",
            docs: ["Sequence number of this message."],
            type: "u64",
          },
          {
            name: "emitterChain",
            docs: ["The Wormhole chain ID denoting the origin of this message."],
            type: "u16",
          },
          {
            name: "emitterAddress",
            docs: ["Emitter of the message."],
            type: {
              array: ["u8", 32],
            },
          },
        ],
      },
    },
    {
      name: "postedVaaV1",
      docs: ["Account used to store a verified VAA."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "info",
            docs: ["VAA metadata."],
            type: {
              defined: {
                name: "postedVaaV1Info",
              },
            },
          },
          {
            name: "payload",
            docs: ["Message payload."],
            type: "bytes",
          },
        ],
      },
    },
    {
      name: "writeEncodedVaaArgs",
      docs: [
        "Arguments for the [write_encoded_vaa](crate::wormhole_core_bridge_solana::write_encoded_vaa)",
        "instruction.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "index",
            docs: ["Index of VAA buffer."],
            type: "u32",
          },
          {
            name: "data",
            docs: ["Data representing subset of VAA buffer starting at specified index."],
            type: "bytes",
          },
        ],
      },
    },
    {
      name: "initMessageV1Args",
      docs: [
        "Arguments for the [init_message_v1](crate::wormhole_core_bridge_solana::init_message_v1)",
        "instruction.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "nonce",
            docs: ["Unique id for this message."],
            type: "u32",
          },
          {
            name: "commitment",
            docs: ["Solana commitment level for Guardian observation."],
            type: {
              defined: {
                name: "commitment",
              },
            },
          },
          {
            name: "cpiProgramId",
            docs: [
              "Optional program ID if the emitter address will be your program ID.",
              "",
              'NOTE: If `Some(program_id)`, your emitter authority seeds to be \\[b"emitter\\].',
            ],
            type: {
              option: "pubkey",
            },
          },
        ],
      },
    },
    {
      name: "writeMessageV1Args",
      docs: [
        "Arguments for the [write_message_v1](crate::wormhole_core_bridge_solana::write_message_v1)",
        "instruction.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "index",
            docs: ["Index of message buffer."],
            type: "u32",
          },
          {
            name: "data",
            docs: ["Data representing subset of message buffer starting at specified index."],
            type: "bytes",
          },
        ],
      },
    },
    {
      name: "header",
      docs: ["`EncodedVaa` account header."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "status",
            docs: [
              "Processing status. **This encoded VAA is only considered usable when this status is set",
              "to [Verified](ProcessingStatus::Verified).**",
            ],
            type: {
              defined: {
                name: "processingStatus",
              },
            },
          },
          {
            name: "writeAuthority",
            docs: ["The authority that has write privilege to this account."],
            type: "pubkey",
          },
          {
            name: "version",
            docs: ["VAA version. Only when the VAA is verified is this version set to a value."],
            type: "u8",
          },
        ],
      },
    },
    {
      name: "timestamp",
      docs: [
        "This struct defines unix timestamp as u32 (as opposed to more modern systems that have adopted",
        "i64). Methods for this struct are meant to convert Solana's clock type to this type assuming we",
        "are far from year 2038.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "value",
            type: "u32",
          },
        ],
      },
    },
    {
      name: "duration",
      docs: ["To be used with the [Timestamp] type, this struct defines a duration in seconds."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "seconds",
            type: "u32",
          },
        ],
      },
    },
    {
      name: "messageHash",
      docs: ["This type is used to represent a message hash (keccak)."],
      type: {
        kind: "struct",
        fields: [
          {
            name: "bytes",
            type: {
              array: ["u8", 32],
            },
          },
        ],
      },
    },
    {
      name: "chainIdSolanaOnly",
      docs: [
        "This type is kind of silly. But because [PostedMessageV1](crate::state::PostedMessageV1) has the",
        "emitter chain ID as a field, which is unnecessary since it is always Solana's chain ID, we use",
        "this type to guarantee that the encoded chain ID is always `1`.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "chainId",
            type: "u16",
          },
        ],
      },
    },
    {
      name: "emitterInfo",
      type: {
        kind: "struct",
        fields: [
          {
            name: "chain",
            type: "u16",
          },
          {
            name: "address",
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "sequence",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "legacyInstruction",
      docs: [
        "Legacy instruction selector.",
        "",
        "NOTE: No more instructions should be added to this enum. Instead, add them as Anchor instruction",
        "handlers, which will inevitably live in",
        "[wormhole_core_bridge_solana](crate::wormhole_core_bridge_solana).",
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "initialize",
          },
          {
            name: "postMessage",
          },
          {
            name: "postVaa",
          },
          {
            name: "setMessageFee",
          },
          {
            name: "transferFees",
          },
          {
            name: "upgradeContract",
          },
          {
            name: "guardianSetUpdate",
          },
          {
            name: "verifySignatures",
          },
          {
            name: "postMessageUnreliable",
          },
        ],
      },
    },
    {
      name: "emitterType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "unset",
          },
          {
            name: "legacy",
          },
          {
            name: "executable",
          },
        ],
      },
    },
    {
      name: "messageStatus",
      docs: ["Status of a message. When a message is posted, its status is", "[Published](MessageStatus::Published)."],
      type: {
        kind: "enum",
        variants: [
          {
            name: "published",
          },
          {
            name: "writing",
          },
          {
            name: "readyForPublishing",
          },
        ],
      },
    },
    {
      name: "publishMessageDirective",
      docs: ["Directive used to determine how to post a Core Bridge message."],
      type: {
        kind: "enum",
        variants: [
          {
            name: "message",
            fields: [
              {
                name: "nonce",
                type: "u32",
              },
              {
                name: "payload",
                type: "bytes",
              },
              {
                name: "commitment",
                type: {
                  defined: {
                    name: "commitment",
                  },
                },
              },
            ],
          },
          {
            name: "programMessage",
            fields: [
              {
                name: "programId",
                type: "pubkey",
              },
              {
                name: "nonce",
                type: "u32",
              },
              {
                name: "payload",
                type: "bytes",
              },
              {
                name: "commitment",
                type: {
                  defined: {
                    name: "commitment",
                  },
                },
              },
            ],
          },
          {
            name: "preparedMessage",
          },
        ],
      },
    },
    {
      name: "processingStatus",
      docs: ["Encoded VAA's processing status."],
      type: {
        kind: "enum",
        variants: [
          {
            name: "unset",
          },
          {
            name: "writing",
          },
          {
            name: "verified",
          },
        ],
      },
    },
    {
      name: "commitment",
      docs: [
        "Representation of Solana's commitment levels. This enum is not exhaustive because Wormhole only",
        "considers these two commitment levels in its Guardian observation.",
        "",
        "See <https://docs.solana.com/cluster/commitments> for more info.",
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "confirmed",
          },
          {
            name: "finalized",
          },
        ],
      },
    },
    {
      name: "guardianSet",
      docs: [
        "Account used to store a guardian set. The keys encoded in this account are Ethereum pubkeys.",
        "Its expiration time is determined at the time a guardian set is updated to a new set, where the",
        "current network clock time is used with",
        "[guardian_set_ttl](crate::state::Config::guardian_set_ttl).",
        "",
        "NOTE: The account schema is the same as legacy guardian sets, but this account now has a",
        "discriminator generated by Anchor's [account] macro. When the Core Bridge program performs a",
        "guardian set update with this implementation, guardian sets will now have this Anchor-generated",
        "discriminator.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "index",
            docs: ["Index representing an incrementing version number for this guardian set."],
            type: "u32",
          },
          {
            name: "keys",
            docs: ["Ethereum-style public keys."],
            type: {
              vec: {
                array: ["u8", 20],
              },
            },
          },
          {
            name: "creationTime",
            docs: ["Timestamp representing the time this guardian became active."],
            type: {
              defined: {
                name: "timestamp",
              },
            },
          },
          {
            name: "expirationTime",
            docs: ["Expiration time when VAAs issued by this set are no longer valid."],
            type: {
              defined: {
                name: "timestamp",
              },
            },
          },
        ],
      },
    },
    {
      name: "signatureSet",
      docs: [
        "Account used to store information about a guardian set used to sign a VAA. There is only one",
        "signature set for each verified VAA (associated with a",
        "[PostedVaaV1](crate::legacy::state::PostedVaaV1) account). This account is created using the",
        "verify signatures legacy instruction.",
        "",
        "NOTE: The account schema is the same as legacy signature sets, but this account now has a",
        "discriminator generated by Anchor's [account] macro. When the Core Bridge program upgrades to",
        "this implementation from the old one, integrators in the middle of verifying signatures will",
        "have to use a new keypair for this account and try again.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "sigVerifySuccesses",
            docs: ["Signatures of validators"],
            type: {
              vec: "bool",
            },
          },
          {
            name: "messageHash",
            docs: ["Hash of the VAA message body."],
            type: {
              defined: {
                name: "messageHash",
              },
            },
          },
          {
            name: "guardianSetIndex",
            docs: ["Index of the guardian set"],
            type: "u32",
          },
        ],
      },
    },
    {
      name: "encodedVaa",
      docs: [
        "Account used to warehouse VAA buffer.",
        "",
        "NOTE: This account should not be used by an external application unless the header's status is",
        "`Verified`. It is encouraged to use the `EncodedVaa` zero-copy account struct instead.",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "header",
            docs: ["Status, write authority and VAA version."],
            type: {
              defined: {
                name: "header",
              },
            },
          },
          {
            name: "buf",
            docs: ["VAA buffer."],
            type: "bytes",
          },
        ],
      },
    },
  ],
  constants: [
    {
      name: "solanaChain",
      type: "u16",
      value: "1",
    },
    {
      name: "feeCollectorSeedPrefix",
      type: "bytes",
      value: "[102, 101, 101, 95, 99, 111, 108, 108, 101, 99, 116, 111, 114]",
    },
    {
      name: "upgradeSeedPrefix",
      type: "bytes",
      value: "[117, 112, 103, 114, 97, 100, 101]",
    },
    {
      name: "programEmitterSeedPrefix",
      type: "bytes",
      value: "[101, 109, 105, 116, 116, 101, 114]",
    },
    {
      name: "maxMessagePayloadSize",
      type: {
        defined: {
          name: "usize",
        },
      },
      value: "30 * 1_024",
    },
  ],
};
