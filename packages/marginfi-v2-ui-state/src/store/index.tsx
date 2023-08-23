import { create } from "zustand";
import { MrgnlendSlice, createMrgnlendSlice } from "./mrgnlendSlice";
import { UserProfileSlice, createUserProfileSlice } from "./userProfileSlice";

const useStore = create<MrgnlendSlice & UserProfileSlice>()((...a) => ({
  ...createMrgnlendSlice(...a),
  ...createUserProfileSlice(...a),
}));

export { useStore };
