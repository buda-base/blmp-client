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

export const uiCurrentState = atom<number>({
  key: "uiCurrentState",
  default: -1,
})

type undoState = {
  mask: number
  subjectUri: string
  propertyPath: string
}

export const canUndo = 1
export const canRedo = 2
export const canUndoRedo = 3
export const noUndoRedo = { mask: 0, subjectUri: "", propertyPath: "" }

export const uiUndoState = atom<undoState>({
  key: "uiUndoState",
  default: noUndoRedo,
})
