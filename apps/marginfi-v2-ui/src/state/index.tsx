// For now, we can store all global recoil state here.
// Learn more about recoil here: https://recoiljs.org/docs/introduction/getting-started
import { atom } from "recoil";

const lendZoomLevel = atom({
  key: "lendZoomLevel",
  default: 3,
});

const denominationUSD = atom({
  key: "denominationUSD",
  default: false,
});

const showBadgesState = atom({
  key: "showBadges",
  default: false,
});

export { lendZoomLevel, denominationUSD, showBadgesState };
