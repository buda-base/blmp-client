import React, { useState } from "react"
import { useGotoRecoilSnapshot, useRecoilTransactionObserver_UNSTABLE, useRecoilState } from "recoil"
import { useHotkeys } from "react-hotkeys-hook"
import { uiReadyState } from "../../atoms/common"
import { LiteralWithId, ExtRDFResourceWithLabel } from "../../helpers/rdf/types"

const debug = require("debug")("bdrc:observer")

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

export function TimeTravelObserver() {
  const [snapshots, setSnapshots] = useState([])
  const [current, setCurrent] = useState(0)
  const [first, setFirst] = useState(-1)
  const [uiReady] = useRecoilState(uiReadyState)

  useHotkeys(
    "ctrl+z",
    () => {
      debug("UNDO", current, first)
      if (current > first + 1) {
        gotoSnapshot(snapshots[current - 1])
        setCurrent(current - 1)
        const delay = 150
        setTimeout(() => document.activeElement.blur(), delay)
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
        setTimeout(() => document.activeElement.blur(), delay)
      }
    },
    [current]
  )

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
    //debug("uiR", uiReady)
    if (!uiReady) return

    // DONE dont add a previous state as a new one
    if (
      snapshots.filter((s, i) => {
        if (s.getID() === snapshot.getID()) {
          setCurrent(i)
          debug("ID", s.getID(), i)
          return true
        }
        return false
      }).length
    )
      return

    const modified = []
    for (const a of snapshot.getNodes_UNSTABLE(true)) {
      const info = snapshot.getInfo_UNSTABLE(a)
      if (info.isModified) {
        const tab = info.loadable.getValue()
        let empty = false
        if (tab.length && tab[0] instanceof LiteralWithId) empty = tab[0].language === "" && tab[0].value === ""
        else if (tab.length && tab[0] instanceof ExtRDFResourceWithLabel) empty = tab[0].id === "tmp:uri"
        if (!empty) {
          modified.push({ a, info })
          //debug("MODIFIED", uiReady, first, a.key, a, info, tab)
        }
      }
      // DONE do not not take a snapshot if current change is UI language
      if (["uiLangState", "uiTabState", "uiEditState"].includes(a.key) && info.isModified) return
    }

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
  })

  const gotoSnapshot = useGotoRecoilSnapshot()

  return (
    <div className="small col-md-6 mx-auto text-center text-muted">
      Restore Snapshot:
      {snapshots.map((snapshot, i) => (
        <button
          key={i}
          className={"btn btn-sm btn-danger mx-1 icon btn-circle" + (i == current ? " current" : "")}
          onClick={() => gotoSnapshot(snapshot)}
        >
          {i}
        </button>
      ))}
    </div>
  )
}
