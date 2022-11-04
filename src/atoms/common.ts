import { atom, atomFamily, selectorFamily } from "recoil"

export const sessionLoadedState = atom<boolean>({
  key: "sessionLoadedState",
  default: false,
})

export const profileIdState = atom<string>({
  key: "profileIdState",
  default: "",
})

export const userIdState = atom<string>({
  key: "userIdState",
  default: "",
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
