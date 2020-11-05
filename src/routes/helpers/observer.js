import React, { useState } from "react"
import { useGotoRecoilSnapshot, useRecoilTransactionObserver_UNSTABLE } from "recoil"

export function TimeTravelObserver() {
  const [snapshots, setSnapshots] = useState([])

  useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
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
