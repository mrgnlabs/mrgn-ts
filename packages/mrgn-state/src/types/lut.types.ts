export type AddressLookupTableStateDto = {
  deactivationSlot: string;
  lastExtendedSlot: number;
  lastExtendedSlotStartIndex: number;
  authority?: string;
  addresses: Array<string>;
};

export type AddressLookupTableAccountArgsDto = {
  key: string;
  state: AddressLookupTableStateDto;
};
