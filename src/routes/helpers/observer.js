import React, { useState } from "react"
import { useGotoRecoilSnapshot, useRecoilTransactionObserver_UNSTABLE } from "recoil"

const debug = require("debug")("bdrc:observer")

export function TimeTravelObserver() {
  const [snapshots, setSnapshots] = useState([])

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
    //debug("snap:",snapshot)
    for (const a of snapshot.getNodes_UNSTABLE(true)) {
      const info = snapshot.getInfo_UNSTABLE(a)
      //debug(a,info)
      // DONE do not not take a snapshot if current change is UI language
      if (a.key === "uiLangState" && info.isModified) return
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
