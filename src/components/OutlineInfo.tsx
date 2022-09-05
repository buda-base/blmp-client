import React, { useEffect, useRef, useState } from "react"
import { connect } from "react-redux"
import _ from "lodash"

import { outlinesAtom } from "../atoms/common"
import { useRecoilState } from "recoil"

const debug = require("debug")("bdrc:outline:info")

function OutlineInfo(props: any) {
  //debug("props:",props)

  const instance = props.instance
  const volume = props.volume
  const volNum = props.volNum
  const getOutline = props.getOutline

  const [outlines, setOutlines] = useRecoilState(outlinesAtom)
  const [title, setTitle] = useState([])

  useEffect(() => {
    //debug("title:"+volNum+"="+volume+"/"+instance)
    let id = instance,
      node = "",
      sub
    do {
      //debug("id:",id,node,sub)
      if (id && !outlines[id]) {
        getOutline(id)
        break
      }
      node = outlines[id]?.filter((n) => n.id === id)
      if (node?.length && node[0].hasPart) {
        sub = node[0].hasPart
        if (sub && !Array.isArray(sub)) sub = [sub]
        if (sub?.length) {
          sub = outlines[id].filter((n) => sub.includes(n.id))
          sub = _.orderBy(sub, ["partIndex"], ["asc"])

          // TODO: use some index from previous Card
          const index = 0

          node = [sub[index]]
          id = node[0].id

          // TODO: handle locale etc.
          let label = sub[index]["skos:prefLabel"]
          if (label && !Array.isArray(label)) label = [label]
          if (label.length) setTitle(title.concat(label[0]["@value"]))
        }
      }
    } while (node && node[0]?.hasPart) //!node.contentLocationVolume)
  }, [outlines])

  return (
    <div className="outline-info">
      {title.map((t) => (
        <>
          {t}
          <br />
        </>
      ))}
    </div>
  )
}

const mapStateToProps = function (state: any) {
  return {
    manifest: state.manifest,
  }
}

export default connect(mapStateToProps)(OutlineInfo)
