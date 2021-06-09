import React, { useState, FC } from "react"
import {
  useGotoRecoilSnapshot,
  useRecoilTransactionObserver_UNSTABLE,
  useRecoilState,
  Snapshot,
  RecoilValue,
} from "recoil"
import { useHotkeys } from "react-hotkeys-hook"
import {
  uiReadyState,
  uiHistoryState,
  uiTabState,
  uiUndosState,
  canRedo,
  canUndo,
  canUndoRedo,
  undoState,
} from "../../atoms/common"
import {
  LiteralWithId,
  RDFResourceWithLabel,
  ExtRDFResourceWithLabel,
  Value,
  Subject,
  history,
} from "../../helpers/rdf/types"
import { Entity, entitiesAtom } from "../../containers/EntitySelectorContainer"
import { replaceItemAtIndex, removeItemAtIndex } from "../../helpers/atoms"

const debug = require("debug")("bdrc:observer")

/* // TODO rework that piece
const sameFieldModifiedAgain = (m, s1, s2) => {
  if (!s2 || !s2.a) return true
  const m_content_tab = m.info.loadable.getValue(),
    s1_content_tab = s1.info.loadable.getValue(),
    s2_content_tab = s2.info.loadable.getValue()
  for (const i in m_content_tab) {
    const m_content = m_content_tab[i],
      s1_content = s1_content_tab[i]
    let s2_content = s2_content_tab[i]
    //debug("diff", typeof m_content, m_content, s1_content, s2_content)
    if (!s2_content) s2_content = { empty: true }
    let keys = Object.keys(m_content)
    if (!keys) keys = ["this"]
    for (const k of keys) {
      //debug("k", k, typeof m_content[k])
      const tags = ["@id", "@value", "@language", "type", "language", "value"]
      if (s2_content.empty) s2_content[k] = ""
      if (typeof m_content[k] === "object") {
        for (const tag of tags) {
          if (m_content[k][tag] != s1_content[k][tag]) {
            if (
              k === "node" && tag === "value" ||
              tag.endsWith("language") ||
              s1_content[k][tag] == s2_content[k][tag]
            ) {
              //debug("false", tag)
              return false
            } else if (s1_content[k][tag] != s2_content[k][tag]) {
              //debug("true", tag)
              return true
            }
          }
        }
      } else if (typeof m_content[k] === "string") {
        if (tags.includes(k)) {
          if (m_content[k] != s1_content[k]) {
            if (k.endsWith("language") || s1_content[k] == s2_content[k]) {
              //debug("false", k)
              return false
            } else if (s1_content[k] != s2_content[k]) {
              //debug("true", k)
              return true
            }
          }
        }
      }
    }
  }
  return false
}
*/

//let _manualGoto = false ;

const getModified = (snapshot: Snapshot) => {
  const modified = []
  for (const a of snapshot.getNodes_UNSTABLE({ isModified: true })) {
    if (["uiLangState", "uiTabState", "uiEditState"].includes(a.key)) continue

    const info = snapshot.getInfo_UNSTABLE(a)
    if (info.isModified) {
      const tab = info?.loadable?.getValue() as Array<Value>
      let empty = false
      if (tab.length) {
        if (tab[0] instanceof LiteralWithId) empty = tab[0].language === "" && tab[0].value === ""
        else if (tab.length && tab[0] instanceof RDFResourceWithLabel) empty = tab[0].id === "tmp:uri"
        else if (tab.length && tab[0] instanceof ExtRDFResourceWithLabel) empty = tab[0].id === "tmp:uri"
        else if (tab.length && tab[0] instanceof Subject) empty = false
        else if (tab.length && typeof tab === "string") empty = false
        else {
          debug(a, info, tab)
          throw new Error("unknown history modification")
        }
      } else {
        debug(a, info, tab)
        throw new Error("no value in history modification")
      }
      if (!empty) {
        modified.push({ a, info, tab })
      }
    }
  }
  return modified
}

export function TimeTravelObserver(/* entityQname */) {
  const [snapshots, setSnapshots] = useState<Array<Snapshot>>([])
  //const [current, setCurrent] = useRecoilState(uiCurrentState)
  const [uiReady] = useRecoilState(uiReadyState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
    debug("uiR", uiReady, snapshot, snapshot.getID()) //, _manualGoto)

    if (!uiReady /*|| _manualGoto*/) return

    // DONE dont add a previous state as a new one
    if (
      snapshots.filter((s: Snapshot, i: number) => {
        if (s.getID() === snapshot.getID()) {
          //setCurrent(i)
          debug("ID", s.getID(), i)
          return true
        }
        return false
      }).length
    )
      return

    const modified = getModified(snapshot)

    //debug("modified:",JSON.stringify(modified,null,1+1+1))

    // DONE do not not take a snapshot if current change is UI language etc.
    if (modified.length === 0) return

    //setCurrent(snapshots.length)
    setSnapshots([...snapshots, snapshot])

    /* // disable this for now
    // DONE use only one snapshot for all successive modifications of same property value
    if (snapshots.length && modified.length === 1) {
      const nodes1 = Array.from(snapshots[snapshots.length - 1].getNodes_UNSTABLE(true))
      const nodes2 =
        snapshots.length > 1 ? Array.from(snapshots[snapshots.length - 1 - 1].getNodes_UNSTABLE(true)) : null
      //debug("modif:", uiReady, modified, modified[0].info.loadable.getValue(), nodes1, nodes2)
      for (const i in nodes1) {
        const s1 = nodes1[i]
        const s2 = nodes2 ? nodes2[i] : null
        const info1 = snapshots[snapshots.length - 1].getInfo_UNSTABLE(s1)
        const info2 = s2 ? snapshots[snapshots.length - 1 - 1].getInfo_UNSTABLE(s2) : null
        // DONE also create new state when new or deleted prefLabel
        if (
          info1.isModified &&
          s1.key === modified[0].a.key &&
          info1.loadable.contents.length === modified[0].info.loadable.contents.length &&
          // DONE check changes in sub/property based on @value, @id, @language, type
          sameFieldModifiedAgain(modified[0], { a: s1, info: info1 }, s2 ? { a: s2, info: info2 } : null)
        ) {
          // replace previous snapshot for same property
          snapshots[snapshots.length - 1] = snapshot
          setCurrent(snapshots.length - 1)
          setSnapshots([...snapshots])
          return
        }
      }
    }
    if (modified.length) {
      setCurrent(snapshots.length)
      if (uiReady && first === -1) setFirst(snapshots.length)
      setSnapshots([...snapshots, snapshot])
    }
    */
  })

  const gotoSnapshot = useGotoRecoilSnapshot()

  /* // not working
  const myGotoSnapshot = (snapshot,i) => {
    const latests = snapshots[snapshots.length - 1].getLoadable(entitiesAtom).contents, current = snapshot.getLoadable(entitiesAtom).contents    
    const newEntities = [ ...latests ]
    const index1 = latests.findIndex((e) => e.entityQname === entityQname )
    const index2 = current.findIndex((e) => e.entityQname === entityQname )
    if(index1 === index2) {
      //gotoSnapshot(snapshot)
      _manualGoto = true
      newEntities[index1] = current[index1]      
      setEntities(newEntities)
      setCurrent(i)
      const delay=  150 ;
      setTimeout(() => { _manualGoto = false; }, delay);
    }
    else throw new Error("index mismatch")
  }
  */

  const modified = snapshots.map(getModified)

  const makeGotoButton = (snapshot: Snapshot, i: number) => (
    <button
      key={i}
      className={"btn btn-sm btn-danger mx-1 icon btn-circle"} //(i == current ? " current" : "")}
      onClick={() => {
        debug("snapshot-" + i, snapshot, modified[i])
        gotoSnapshot(snapshot)
      }}
    >
      {i}
    </button>
  )

  let first = -1

  const buttons = modified.map((m, i) => {
    if (m.length === 1) {
      if (first === -1) first = i - 1
      return makeGotoButton(snapshots[i], i)
    } else return ""
  })

  if (first >= 0) buttons[first] = makeGotoButton(snapshots[first], first)

  /*
  useHotkeys(
    "ctrl+z",
    () => {
      debug("UNDO", current, first)
      if (current >= first + 1) {
        gotoSnapshot(snapshots[current - 1])
        setCurrent(current - 1)
        const delay = 150
        setTimeout(() => {
          if (document && document.activeElement) {
            const elem = document.activeElement as HTMLElement
            elem.blur()
          }
        }, delay)
      }
    },
    [current]
  )

  useHotkeys(
    "ctrl+y,ctrl+shift+z",
    () => {
      debug("REDO", current, first)
      if (current < snapshots.length - 1) {
        gotoSnapshot(snapshots[current + 1])
        setCurrent(current + 1)
        const delay = 150
        setTimeout(() => {
          if (document && document.activeElement) {
            const elem = document.activeElement as HTMLElement
            elem.blur()
          }
        }, delay)
      }
    },
    [current]
  )
  */

  return (
    <div className="small col-md-6 mx-auto text-center text-muted">
      Restore Snapshot:
      {buttons}
    </div>
  )
}

/* // did not work

type HistoryProps = {
  qname:string,
  prop:string,
  val:Array<Value>
};

export const HistoryContext = createContext<Partial<HistoryProps>>({});

    // <HistoryContext.Provider value={ctx}>
*/

/*
// did not work either

const HistoryUpdater:FC<{
  qname:string
  prop:string
  val:Array<Value>
}> = ({ qname, prop, val }) => {
  const [history] = useRecoilState(uiHistoryState)
  debug("updH:",qname,prop,val);
  return null ;
}

      // <HistoryUpdater qname={ctx.qname} prop={ctx.prop} val={ctx.val} />
*/

const GotoButton: FC<{ label: string; subject: Subject; undo: undoState; setUndo: (s: undoState) => void }> = ({
  label,
  subject,
  undo,
  setUndo,
}) => {
  const [uiReady] = useRecoilState(uiReadyState)
  //const [current, setCurrent] = useRecoilState(uiCurrentState)
  const entityUri = subject.uri

  // TODO: pass subject to UndoButton subcomponent
  const [list, setList] = useRecoilState(subject.getAtomForProperty(undo.propertyPath))

  const disabled =
    label === "REDO" && ![canRedo, canUndoRedo].includes(undo.mask) ||
    label === "UNDO" && ![canUndo, canUndoRedo].includes(undo.mask)

  //debug(label + ":", undo)

  const previousValues = (entityUri: string, subjectUri: string, pathString: string, idx: number) => {
    const histo = history[entityUri]
    if (histo && histo.length > idx) {
      let isInit = false
      histo[idx]["tmp:undone"] = true
      for (let j = idx - 1; j >= 0; j--) {
        if (histo[j] && histo[j]["tmp:allValuesLoaded"]) {
          isInit = histo[j + 1]["tmp:undone"]
        } else {
          if (histo[j] && histo[j][subjectUri] && histo[j][subjectUri][pathString]) {
            return { vals: histo[j][subjectUri][pathString], isInit, prev: j }
          }
        }
      }
    }
    return { vals: [], isInit: true, prev: -1 }
  }

  const nextValues = (entityUri: string, subjectUri: string, pathString: string, idx: number) => {
    const histo = history[entityUri]
    if (histo && histo.length > idx) {
      for (let j = idx + 1; j < histo.length; j++) {
        if (histo[j] && histo[j][subjectUri] && histo[j][subjectUri][pathString]) {
          delete histo[j]["tmp:undone"]
          return { vals: histo[j][subjectUri][pathString], isLast: j === histo.length - 1, next: j }
        }
      }
    }
    return { vals: [], isLast: true, next: -1 }
  }

  const clickHandler = () => {
    const entityUri = subject.uri
    if (entityUri) {
      let idx = undo.current
      if (idx === -1) idx = history[entityUri].length - 1

      debug("click:", idx)

      if (history[entityUri][idx]) {
        for (const k of Object.keys(history[entityUri][idx])) {
          if (!["tmp:undone", "tmp:current"].includes(k))
            for (const p of Object.keys(history[entityUri][idx][k])) {
              if (label === "UNDO") {
                const { vals, isInit, prev } = previousValues(entityUri, k, p, idx)

                // can't undo anymore if found initial value
                if (isInit) setUndo({ ...undo, mask: canRedo, current: prev })
                else setUndo({ ...undo, mask: canUndoRedo, current: prev })

                subject.graph.getValues().noHisto = true
                setList(vals)

                debug(label, "l:", list, "v:", vals, isInit, prev)
              } else if (label === "REDO") {
                const { vals, isLast, next } = nextValues(entityUri, k, p, idx)

                // can't redo anymore if found latest value
                if (isLast) setUndo({ ...undo, mask: canUndo, current: next })
                else setUndo({ ...undo, mask: canUndoRedo, current: next })

                subject.graph.getValues().noHisto = true
                setList(vals)

                debug(label, "l:", list, "v:", vals, isLast, next)
              }
            }
        }
      }
    }
  }

  useHotkeys(
    "ctrl+z",
    () => {
      if (label !== "UNDO") return
      debug("UNDO", undo.current, history)
    },
    []
  )

  useHotkeys(
    "shift+ctrl+z,ctrl+y",
    () => {
      if (label !== "REDO") return
      debug("REDO", undo.current, history)
    },
    []
  )

  return (
    <button
      disabled={disabled}
      key={label}
      className={"btn btn-sm btn-danger mx-1 icon undo-btn"}
      onClick={clickHandler}
    >
      {label}
    </button>
  )
}

export const HistoryHandler: FC<{ entityUri: string }> = ({ entityUri }) => {
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [uiTab] = useRecoilState(uiTabState)
  const [undos, setUndos] = useRecoilState(uiUndosState)
  const undo = undos[entityUri]
  const setUndo = (s: undoState) => setUndos({ ...undos, [entityUri]: s })

  if (!entities[uiTab]) return null

  const subject = entities[uiTab].subject

  return (
    <div className="small col-md-6 mx-auto text-center text-muted">
      {subject && undo && <GotoButton label="UNDO" subject={subject} undo={undo} setUndo={setUndo} />}
      {subject && undo && <GotoButton label="REDO" subject={subject} undo={undo} setUndo={setUndo} />}
    </div>
  )
}
