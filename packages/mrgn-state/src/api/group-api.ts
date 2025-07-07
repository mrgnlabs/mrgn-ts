import { dtoToGroup, MarginfiGroupType, MarginfiGroupTypeDto } from "@mrgnlabs/marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";

export const fetchMarginfiGroup = async (group: PublicKey): Promise<MarginfiGroupType> => {
  const response = await fetch(`/api/bankData/groupData?groupAddress=${group.toBase58()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data: MarginfiGroupTypeDto = await response.json();

  return dtoToGroup(data);
};
