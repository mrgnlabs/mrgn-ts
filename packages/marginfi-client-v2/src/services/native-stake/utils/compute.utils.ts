/**
 * Filters and processes staked asset banks based on user's stake accounts
 *
 * @param publicKey - User's public key
 * @param extendedBankInfos - Array of all bank infos
 * @returns Promise<[ExtendedBankInfo[], ExtendedBankInfo[]]> - [filtered bank infos, staked asset bank infos]
 */
// export const filterStakedAssetBanks = async (
//     publicKey: PublicKey | null,
//     extendedBankInfos: ExtendedBankInfo[]
//   ): Promise<[ExtendedBankInfo[], ExtendedBankInfo[]]> => {
//     const stakedAssetBankInfos = extendedBankInfos.filter((bank) => bank.info.rawBank.config.assetTag === 2);

//     // remove staked asset banks from main array where user does not have an open position
//     let filteredBankInfos = extendedBankInfos.filter((bank) => bank.info.rawBank.config.assetTag !== 2 || bank.isActive);

//     // if connected check for matching stake accounts
//     if (publicKey) {
//       const stakeAccounts = await getStakeAccountsCached(publicKey);

//       // add back staked asset banks for validators uaer has native stake
//       filteredBankInfos = filteredBankInfos.concat(
//         stakedAssetBankInfos.filter((bank) =>
//           stakeAccounts.find((stakeAccount) => stakeAccount.poolMintKey.equals(bank.info.rawBank.mint) && !bank.isActive)
//         )
//       );
//     }

//     return [filteredBankInfos, stakedAssetBankInfos];
//   };

export {};
