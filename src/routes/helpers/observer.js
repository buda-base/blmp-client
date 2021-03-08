import React, { useState } from "react"
import { useGotoRecoilSnapshot, useRecoilTransactionObserver_UNSTABLE } from "recoil"
import { useHotkeys } from "react-hotkeys-hook"

const debug = require("debug")("bdrc:observer")

const sameFieldModifiedAgain = (m, s1, s2) => {
  if (!s2 || !s2.a) return true
  const m_content_tab = m.info.loadable.getValue(),
    s1_content_tab = s1.info.loadable.getValue(),
    s2_content_tab = s2.info.loadable.getValue()
  for (const i in m_content_tab) {
    const m_content = m_content_tab[i],
      s1_content = s1_content_tab[i],
      s2_content = s2_content_tab[i]
    //debug("diff",m_content,s1_content,s2_content)
    for (const k of Object.keys(m_content)) {
      //debug("k",k)
      const tags = ["@id", "@value", "@language", "type"]
      if (typeof m_content[k] === "object") {
        for (const tag of tags) {
          if (m_content[k][tag] != s1_content[k][tag]) {
            if (s2_content && s2_content[k]) {
              if (tag == "@language" || s1_content[k][tag] == s2_content[k][tag]) {
                //debug("false", tag)
                return false
              } else if (s1_content[k][tag] != s2_content[k][tag]) {
                //debug("true", tag)
                return true
              }
            }
          }
        }
      } else if (typeof m_content[k] === "string") {
        if (tags.includes(k)) {
          if (m_content[k] != s1_content[k]) {
            if (s2_content && s2_content[k]) {
              if (k == "@language" || s1_content[k] == s2_content[k]) {
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
  }
  return false
}

export function TimeTravelObserver() {
  const [snapshots, setSnapshots] = useState([])
  const [current, setCurrent] = useState(1) // first undoable state is snapshot[1]

  useHotkeys(
    "ctrl+z",
    () => {
      debug("UNDO", current)
      if (current > 0) gotoSnapshot(snapshots[current - 1])
    },
    [current]
  )

  useHotkeys(
    "ctrl+y,ctrl+shift+z",
    () => {
      debug("REDO", current)
      if (current < snapshots.length - 1) gotoSnapshot(snapshots[current + 1])
    },
    [current]
  )

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
    // DONE dont add a previous state as a new one
    // DEPRECATED because undo/redo more intuitive to use when a restored previous state is considered as new one
    if (
      snapshots.filter((s, i) => {
        if (s.getID() === snapshot.getID()) {
          setCurrent(i)
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
        modified.push({ a, info })
        debug(a.key, a, info)
      }
      // DONE do not not take a snapshot if current change is UI language
      if (a.key === "uiLangState" && info.isModified) return
    }

    // DONE use only one snapshot for all successive modifications of same property value
    if (snapshots.length && modified.length === 1) {
      const nodes1 = Array.from(snapshots[snapshots.length - 1].getNodes_UNSTABLE(true))
      const nodes2 =
        snapshots.length > 1 ? Array.from(snapshots[snapshots.length - 1 - 1].getNodes_UNSTABLE(true)) : null
      //debug("modif:", modified,modified[0].info.loadable.getValue(),nodes1,nodes2)
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
    setCurrent(snapshots.length)
    setSnapshots([...snapshots, snapshot])
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
