import { atom } from "recoil"
import { FC } from "react"
import { Value, Subject } from "../helpers/rdf/types"

const debug = require("debug")("bdrc:common")

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
  default: -1,
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
  enabled: boolean
  subjectUri: string
  propertyPath: string
  parentPath: Array<string>
}

const sameUndoSub = (undo1: undoState, undo2: undoState) => {
  const ret =
    undo1.enabled === undo2.enabled &&
    undo1.subjectUri === undo2.subjectUri &&
    undo1.propertyPath === undo2.propertyPath &&
    undo1.parentPath.length === undo2.parentPath.length &&
    undo1.parentPath.filter((u, i) => u === undo2.parentPath[i]).length === undo1.parentPath.length
  //debug("same?",ret,undo1,undo2)
  return ret
}

export const sameUndo = (undo1: { prev: undoState; next: undoState }, undo2: { prev: undoState; next: undoState }) => {
  return (
    !undo1 && !undo2 || undo1 && undo2 && sameUndoSub(undo1.prev, undo2.prev) && sameUndoSub(undo1.next, undo2.next)
  )
}

export const noUndo = { enabled: false, subjectUri: "", propertyPath: "", parentPath: [] }

export const noUndoRedo = { prev: noUndo, next: noUndo }

export const uiUndosState = atom<Record<string, Record<string, undoState>>>({
  key: "uiUndosState",
  default: {},
})

export const uiNavState = atom<string>({
  key: "uiNavState",
  default: "",
})

export const sessionLoadedState = atom<boolean>({
  key: "sessionLoadedState",
  default: false,
})
