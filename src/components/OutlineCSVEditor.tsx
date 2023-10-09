import React, { useEffect } from "react"
import { useRecoilState } from "recoil"
import { uiTabState } from "../atoms/common"

export default function OutlineCSVEditor() {
  const [tab, setTab] = useRecoilState(uiTabState)

  // TODO: addd outline in left bar
  useEffect(() => {
    if (tab != -1) setTab(-1)
  }, [tab])

  return <div>WIP</div>
}
