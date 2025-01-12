import { PublicKey } from "@solana/web3.js";

export const SINGLE_POOL_PROGRAM_ID = new PublicKey("SVSPxpvHdN29nkVg9rPapPNDddN5DipNLRUFhyjFThE");
export const STAKE_PROGRAM_ID = new PublicKey("Stake11111111111111111111111111111111111111");
export const MPL_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
export const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
export const SYSVAR_RENT_ID = new PublicKey("SysvarRent111111111111111111111111111111111");
export const SYSVAR_CLOCK_ID = new PublicKey("SysvarC1ock11111111111111111111111111111111");
export const SYSVAR_STAKE_HISTORY_ID = new PublicKey("SysvarStakeHistory1111111111111111111111111");
export const STAKE_CONFIG_ID = new PublicKey("StakeConfig11111111111111111111111111111111");

// export const MAX_U64 = (2n ** 64n - 1n).toString();
export const MAX_U64 = BigInt("18446744073709551615").toString();
