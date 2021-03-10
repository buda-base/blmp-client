import { atom } from "recoil"

export const uiLangState = atom<string>({
  key: "uiLangState",
  default: "en",
})

export const uiReadyState = atom<boolean>({
  key: "uiReadyState",
  default: false,
})
