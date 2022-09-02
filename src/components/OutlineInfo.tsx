import React, { useEffect, useRef, useState } from "react"
import { connect } from "react-redux"

const debug = require("debug")("bdrc:outline")

function OutlineInfo(props: any) {
  //debug("props:",props)

  return <div className="outline-info">{props.data.filename}</div>
}

const mapStateToProps = function (state: any) {
  return {
    manifest: state.manifest,
  }
}

export default connect(mapStateToProps)(OutlineInfo)
