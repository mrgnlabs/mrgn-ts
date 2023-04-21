import { ExtendedBankInfo, MarginfiAccount, MarginfiClient, TokenMetadata } from "@mrgnlabs/marginfi-client-v2";
import axios from "axios";
import tokenInfos from "./token_info.json";
import { object, string, number, array, Infer, assert } from "superstruct";
import { superStake, withdrawSuperstake } from "./superStakeActions";
import { DispatchAction, JupiterParams } from "./types";

interface HandlePromptSubmitParams {
  input: string;
  walletPublicKey?: string;
  onBeforeSubmit: () => void;
  onSubmitSuccess: (data: any) => void;
  onSubmitError: () => void;
  onActionStart: () => void;
  onActionEnd: (error: boolean) => void;
  action: (data: any) => Promise<boolean>;
  url: string;
}

const handlePromptSubmit = async ({
  input,
  walletPublicKey,
  onBeforeSubmit,
  onSubmitSuccess,
  onSubmitError,
  onActionStart,
  onActionEnd,
  action,
  url,
}: HandlePromptSubmitParams) => {
  onBeforeSubmit();

  try {
    const res = await axios.post(url, {
      input,
      walletPublicKey,
    });

    onSubmitSuccess(res.data);

    if (res.data.data) {
      onActionStart();
      const actionSuccess = await action({ ...res.data.data });
      onActionEnd(!actionSuccess);
    }
  } catch (error) {
    console.error("Error calling API route:", error);
    onSubmitError();
  }
};

// ================ token metadata ================

const TokenMetadataRaw = object({
  address: string(),
  chainId: number(),
  decimals: number(),
  name: string(),
  symbol: string(),
  logoURI: string(),
  extensions: object({
    coingeckoId: string(),
  }),
});
const TokenMetadataList = array(TokenMetadataRaw);

export type TokenMetadataRaw = Infer<typeof TokenMetadataRaw>;
export type TokenMetadataListRaw = Infer<typeof TokenMetadataList>;

function parseTokenMetadata(tokenMetadataRaw: TokenMetadataRaw): TokenMetadata {
  return {
    icon: tokenMetadataRaw.logoURI,
  };
}

function parseTokenMetadatas(tokenMetadataListRaw: TokenMetadataListRaw): {
  [symbol: string]: TokenMetadata;
} {
  return tokenMetadataListRaw.reduce(
    (config, current, _) => ({
      [current.symbol]: parseTokenMetadata(current),
      ...config,
    }),
    {} as {
      [symbol: string]: TokenMetadata;
    }
  );
}

export function loadTokenMetadatas(): {
  [symbol: string]: TokenMetadata;
} {
  assert(tokenInfos, TokenMetadataList);
  return parseTokenMetadatas(tokenInfos);
}

export const SAMPLE_PROMPTS = [
  "Show me my account, fool!",
  "Deposit 10 USDC into marginfi",
  "I want to lend 100 usdc on marginfi",
  "Can I borrow 1 SOL from marginfi?",
  "Withdraw all my USDC from marginfi",
  "How much SOL do I have deposited in marginfi?",
  "How much BONK do I have deposited in marginfi?",
  "Is DUST supported on marginfi?",
  "Show me my debt on marginfi",
  "How is my health calculated on hubble?",
  "给我查下最新的eth价格",
  "What is dialect?",
  "크립토 시장이 성장할 거라고 생각하니?",
  "Hola, que sabes sobre bitcoin?",
];

const dispatchMarginfiAction = async ({
  action,
  amount,
  tokenSymbol,
  marginfiAccount,
  marginfiClient,
  extendedBankInfos,
  jupiter,
  reloadBanks,
}: {
  action: DispatchAction;
  amount: string;
  tokenSymbol: string;
  marginfiAccount: MarginfiAccount | null;
  marginfiClient?: MarginfiClient;
  extendedBankInfos: ExtendedBankInfo[];
  jupiter: JupiterParams;
  reloadBanks: () => Promise<void>;
}): Promise<boolean> => {
  let _marginfiAccount = marginfiAccount;
  try {
    // If user does not have a marginfi account, throw an error for now.
    // @todo If the account doesn't exist and the user is trying to take an action other than deposit,
    // tell the user in prompt response that they need to deposit first.
    if (_marginfiAccount === null) {
      if (action === "deposit") {
        if (!marginfiClient) {
          throw new Error("Marginfi client was not provided.");
        }

        try {
          // If the user does not have a marginfi account, create one for them.

          // First, we double check that we don't have a state management problem.
          const userAccounts = await marginfiClient.getMarginfiAccountsForAuthority();
          if (userAccounts.length > 0) {
            try {
              await reloadBanks();
            } catch (error: any) {
              throw new Error(`Error while reloading state: ${error}`);
            }
          }

          // If we're all good on state, we create an account
          _marginfiAccount = await marginfiClient.createMarginfiAccount();
        } catch (error: any) {
          throw new Error(`Error while creating marginfi account: ${error}`);
        }
      } else {
        throw new Error("This action requires a marginfi account.");
      }
    }

    const amountFloat = parseFloat(amount);

    const bankInfo = extendedBankInfos.find((bank) => bank.tokenName.toUpperCase() === tokenSymbol);
    if (!bankInfo) {
      throw new Error(`Bank info was not found, tokenSymbol: ${tokenSymbol} bankInfo: ${bankInfo}`);
    }

    let mSOLBank;
    let SOLBank;

    switch (action) {
      case "deposit":
        await _marginfiAccount.deposit(amountFloat, bankInfo.bank);
        break;

      case "borrow":
        await _marginfiAccount.borrow(parseFloat(amount), bankInfo.bank);
        break;

      case "stake":
        mSOLBank = extendedBankInfos.find((bank) => bank.tokenName === "mSOL");
        if (!mSOLBank) {
          throw new Error("mSOL bank info was not found");
        }
        SOLBank = extendedBankInfos.find((bank) => bank.tokenName === "SOL");
        if (!SOLBank) {
          throw new Error("SOL bank info was not found");
        }

        await superStake(_marginfiAccount, amountFloat, mSOLBank, SOLBank, reloadBanks);
        break;

      case "unstake":
        mSOLBank = extendedBankInfos.find((bank) => bank.tokenName === "mSOL");
        if (!mSOLBank) {
          throw new Error("mSOL bank info was not found");
        }
        SOLBank = extendedBankInfos.find((bank) => bank.tokenName === "SOL");
        if (!SOLBank) {
          throw new Error("SOL bank info was not found");
        }

        await withdrawSuperstake(_marginfiAccount, amountFloat, mSOLBank, SOLBank, reloadBanks, jupiter);
        break;

      default:
        console.log("Invalid action passed to action().");
        break;
    }
  } catch (error: any) {
    console.log(`Error while performing action '${action}': ${error}`);
    return false;
  }

  return true;
};

export { dispatchMarginfiAction, handlePromptSubmit };

export * from "./types";
export * from "./superStakeActions";
