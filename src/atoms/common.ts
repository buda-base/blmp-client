import { atom } from "recoil"

export const sessionLoadedState = atom<boolean>({
  key: "sessionLoadedState",
  default: false,
})

export const reloadProfileState = atom<boolean>({
  key: "reloadProfileState",
  default: true,
})

export const profileIdState = atom<string|null>({
  key: "profileIdState",
  default: null,
})

export const userIdState = atom<string|null>({
  key: "userIdState",
  default: null,
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
