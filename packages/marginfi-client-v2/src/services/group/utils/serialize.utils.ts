import { MarginfiGroupTypeDto, MarginfiGroupType } from "../types";

export function groupToDto(group: MarginfiGroupType): MarginfiGroupTypeDto {
  return {
    admin: group.admin.toBase58(),
    address: group.address.toBase58(),
  };
}
