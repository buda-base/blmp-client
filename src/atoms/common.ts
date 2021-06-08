import { atom } from "recoil"
import { FC } from "react"
import { Value, Subject } from "../helpers/rdf/types"

export const uiLangState = atom<string>({
  key: "uiLangState",
  default: "en",
})

export const uiReadyState = atom<boolean>({
  key: "uiReadyState",
  default: false,
})

export const uiTabState = atom<number>({
  key: "uiTabState",
  default: 0,
})

export const uiRIDState = atom<string[]>({
  key: "uiRIDState",
  default: [],
})

export const uiEditState = atom<string>({
  key: "uiEditState",
  default: "",
})

export const uiHistoryState = atom<Record<string, never> | FC<{ string: { string: Array<Value> } }>>({
  key: "uiHistoryState",
  default: {},
})

export type undoState = {
  mask: number
  subjectUri: string
  propertyPath: string
  current: number
}

export const canUndo = 1
export const canRedo = 2
export const canUndoRedo = 3
export const noUndoRedo = { mask: 0, subjectUri: "", propertyPath: "", current: -1 }

export const uiUndosState = atom<Record<string, undoState>>({
  key: "uiUndosState",
  default: {},
})
