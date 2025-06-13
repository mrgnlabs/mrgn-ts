import { PublicKey } from "@solana/web3.js";
import { MarginfiGroupTypeDto, MarginfiGroupType } from "../types";

export function dtoToGroup(groupDto: MarginfiGroupTypeDto): MarginfiGroupType {
  return {
    admin: new PublicKey(groupDto.admin),
    address: new PublicKey(groupDto.address),
  };
}
