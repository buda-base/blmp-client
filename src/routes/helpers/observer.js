import React, { useState } from "react"
import { useGotoRecoilSnapshot, useRecoilTransactionObserver_UNSTABLE } from "recoil"

const debug = require("debug")("bdrc:observer")

export function TimeTravelObserver() {
  const [snapshots, setSnapshots] = useState([])

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
    // DONE dont add a previous state as a new one
    if (snapshots.filter((s) => s.getID() === snapshot.getID()).length) return

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
      debug("modif:", modified)
      for (const a of snapshots[snapshots.length - 1].getNodes_UNSTABLE(true)) {
        const info = snapshots[snapshots.length - 1].getInfo_UNSTABLE(a)
        // DONE also create new state when new or deleted prefLabel
        if (
          info.isModified &&
          a.key === modified[0].a.key &&
          info.loadable.contents.length === modified[0].info.loadable.contents.length
        ) {
          // replace previous snapshot for same property
          snapshots[snapshots.length - 1] = snapshot
          setSnapshots([...snapshots])
          return
        }
      }
    }

    setSnapshots([...snapshots, snapshot])
  })

  const gotoSnapshot = useGotoRecoilSnapshot()

  return (
    <div className="small col-md-6 mx-auto text-center text-muted">
      Restore Snapshot:
      {snapshots.map((snapshot, i) => (
        <button key={i} className="btn btn-sm btn-danger mx-1 icon btn-circle" onClick={() => gotoSnapshot(snapshot)}>
          {i}
        </button>
      ))}
    </div>
  )
}
