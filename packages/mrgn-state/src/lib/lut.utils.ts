import { AddressLookupTableAccount, PublicKey } from "@solana/web3.js";
import { AddressLookupTableAccountArgsDto } from "../types/lut.types";

export function lutAccountToDto(lutAccount: AddressLookupTableAccount): AddressLookupTableAccountArgsDto {
  return {
    key: lutAccount.key.toBase58(),
    state: {
      deactivationSlot: lutAccount.state.deactivationSlot.toString(),
      lastExtendedSlot: lutAccount.state.lastExtendedSlot,
      lastExtendedSlotStartIndex: lutAccount.state.lastExtendedSlotStartIndex,
      authority: lutAccount.state.authority?.toBase58(),
      addresses: lutAccount.state.addresses.map((address) => address.toBase58()),
    },
  };
}

export function dtoToLutAccount(lutAccountDto: AddressLookupTableAccountArgsDto): AddressLookupTableAccount {
  const args = {
    key: new PublicKey(lutAccountDto.key),
    state: {
      deactivationSlot: BigInt(lutAccountDto.state.deactivationSlot),
      lastExtendedSlot: lutAccountDto.state.lastExtendedSlot,
      lastExtendedSlotStartIndex: lutAccountDto.state.lastExtendedSlotStartIndex,
      authority: lutAccountDto.state.authority ? new PublicKey(lutAccountDto.state.authority) : undefined,
      addresses: lutAccountDto.state.addresses.map((address) => new PublicKey(address)),
    },
  };

  return new AddressLookupTableAccount(args);
}
