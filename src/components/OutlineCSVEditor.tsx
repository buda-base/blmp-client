import React, { useEffect, useState } from "react"
import { useRecoilState } from "recoil"

import { uiTabState } from "../atoms/common"
import config from "../config"

const debug = require("debug")("bdrc:csved")

export default function OutlineCSVEditor(props) {
  const { RID } = props
  const [tab, setTab] = useRecoilState(uiTabState)
  const [csv, setCsv] = useState("")

  debug("RID:", RID)

  useEffect(() => {
    if (RID && !csv) {
      setCsv(true)
      const resp = fetch(config.API_BASEURL + "outline/csv/" + RID).then((data) => {
        data.text().then((text) => {
          setCsv(text)
        })
      })
    }
  }, [RID])

  // TODO: addd outline in left bar
  useEffect(() => {
    if (tab != -1) setTab(-1)
  }, [tab])

  return <div>WIP</div>
}
