import React, { useEffect, useRef, useState } from "react"
import { connect } from "react-redux"
import _ from "lodash"

import { outlinesAtom } from "../atoms/common"
import { useRecoilState } from "recoil"

const debug = require("debug")("bdrc:outline:info")

function OutlineInfo(props: any) {
  //debug("props:",props)
  const { manifest, data, title, getPageTitlePath, i } = props

  useEffect(() => {
    if (!title) getPageTitlePath(i + 1)
  })

  const indent = 20,
    init = 5

  return (
    <div className="outline-info" data-i={i} ref={(el) => props.refs.current[i] = el}>
      {i + 1}
      <br />
      {!title || !title.length ? data.filename : "title goes here"}
    </div>
  )
}

const mapStateToProps = function (state: any) {
  return {
    manifest: state.manifest,
  }
}

export default connect(mapStateToProps)(OutlineInfo)
