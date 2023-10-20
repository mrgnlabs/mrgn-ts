import { atom } from "recoil";

export const tabActiveAtom = atom<"lend" | "borrow">({
  key: "tabActiveAtom",
  default: "lend",
});

export const isSideDrawerVisible = atom<boolean>({
  key: "isSideDrawerVisible",
  default: false,
});
