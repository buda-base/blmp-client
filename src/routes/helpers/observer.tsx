import React, { useState, FC } from "react"
import {
  useGotoRecoilSnapshot,
  useRecoilTransactionObserver_UNSTABLE,
  useRecoilState,
  Snapshot,
  RecoilValue,
} from "recoil"
import { useHotkeys } from "react-hotkeys-hook"
import { uiReadyState } from "../../atoms/common"
import { LiteralWithId, RDFResourceWithLabel, ExtRDFResourceWithLabel, Value, Subject } from "../../helpers/rdf/types"
import { Entity, entitiesAtom } from "../../containers/EntitySelectorContainer"

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
  const [current, setCurrent] = useState(0)
  const [uiReady] = useRecoilState(uiReadyState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
    debug("uiR", uiReady, snapshot, snapshot.getID()) //, _manualGoto)

    if (!uiReady /*|| _manualGoto*/) return

    // DONE dont add a previous state as a new one
    if (
      snapshots.filter((s: Snapshot, i: number) => {
        if (s.getID() === snapshot.getID()) {
          setCurrent(i)
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

    setCurrent(snapshots.length)
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
      className={"btn btn-sm btn-danger mx-1 icon btn-circle" + (i == current ? " current" : "")}
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

  return (
    <div className="small col-md-6 mx-auto text-center text-muted">
      Restore Snapshot:
      {buttons}
    </div>
  )
}
