import React, { useEffect, useRef, useState } from "react"
import { connect } from "react-redux"
import _ from "lodash"

import { outlinesAtom } from "../atoms/common"
import { useRecoilState } from "recoil"

const debug = require("debug")("bdrc:outline:info")

function OutlineInfo(props: any) {
  //debug("props:",props)
  const { manifest, data, title } = props

  return (
    <div className="outline-info">
      {props.i}
      <br />
      {!title || !title.length
        ? data.filename
        : title.map((t) => (
            <>
              {t.labels[0]["@value"]}
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
