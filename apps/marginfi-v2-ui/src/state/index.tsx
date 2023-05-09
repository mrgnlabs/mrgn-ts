// For now, we can store all global recoil state here.
// Learn more about recoil here: https://recoiljs.org/docs/introduction/getting-started
import { atom } from 'recoil';

const lendZoomLevel = atom({
  key: 'lendZoomLevel',
  default: 4,
})

export {
  lendZoomLevel
}
