import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { WalletToken } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";

///////////////////////
// Utils functions to get the bank or wallet token by pk
export const getBankByPk = (banks: ExtendedBankInfo[], pk: PublicKey | null) => {
  if (!pk) return null;
  const bank = banks.find((bank) => bank.address.equals(pk));
  if (bank) return bank;
  return null;
};

export const getBankOrWalletTokenByPk = (
  banks: ExtendedBankInfo[],
  walletTokens: WalletToken[] | null,
  pk: PublicKey | null
) => {
  if (!pk) return null;

  const bank = getBankByPk(banks, pk);
  if (bank) return bank;

  const walletToken = walletTokens?.find((token) => token.address.equals(pk));
  if (walletToken) return walletToken;

  return null;
};
///////////////////////
