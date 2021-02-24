import { atom } from "recoil"

export const uiLangState = atom<string>({
  key: "uiLangState",
  default: "en",
})
