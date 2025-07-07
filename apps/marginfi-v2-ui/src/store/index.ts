import { UseBoundStore, StoreApi } from "zustand";
import { UiState, createUiStore } from "./uiStore";
import { UserProfileState, createUserProfileStore } from "./userProfileStore";

const useUiStore: UseBoundStore<StoreApi<UiState>> = createUiStore();
const useUserProfileStore: UseBoundStore<StoreApi<UserProfileState>> = createUserProfileStore();

export { useUiStore, useUserProfileStore };
