import { atom } from "recoil"

export const reloadProfileState = atom<boolean>({
  key: "reloadProfileState",
  default: true,
})

export const userQnameState = atom<string|null>({
  key: "userQnameState",
  default: "tmp:uri",
})

export const RIDprefixState = atom<string|null>({
  key: "RIDprefixState",
  default: null,
})

export const outlinesAtom = atom<Record<string, any>>({
  key: "outlinesAtom",
  default: {},
})

export const demoAtom = atom<boolean>({
  key: "demoAtom",
  default: false,
})

export const idTokenAtom = atom<string|null>({
  key: "idTokenAtom",
  default: localStorage.getItem("BLMPidToken")
})