import React, { useState } from "react"
import { useHistory } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { connect } from "react-redux"
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles"

import InstanceCSVSearch from "../components/InstanceCSVSearch"
import OutlineCSVEditor from "../components/OutlineCSVEditor"

const debug = require("debug")("bdrc:outline")

const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#d73443",
      dark: "#d73443",
    },
  },
})

function OutlineCSVApp(props: any) {
  const [isFetching, setIsFetching] = useState(false)
  const [fetchErr, setFetchErr] = useState(null)

  return (
    <ThemeProvider theme={theme}>
      <InstanceCSVSearch
        history={props.history}
        isFetching={isFetching}
        fetchErr={fetchErr}
        //{...(manifest && manifest["imggroup"] ? { forVolume: manifest["imggroup"] } : {})}
      />
    </ThemeProvider>
  )
}

const mapStateToProps = function (state: any) {
  return {
    manifest: state.manifest,
  }
}

const OutlineCSVAppContainer = connect(mapStateToProps)(OutlineCSVApp)

function OutlineCSVEditorContainer(props) {
  const auth = useAuth0()
  const routerHistory = useHistory()

  debug("csv:", props)

  if (props.match?.params?.rid)
    return (
      <div role="main" className="centered-ctn pt-4" style={{ textAlign: "center" }}>
        <div className={"header etextinstance"}>
          <div className="shape-icon"></div>
          <div>
            <h1 style={{ textAlign: "left" }}>Outline</h1>
            <span>{props.match?.params?.rid}</span>
          </div>
        </div>
        <OutlineCSVEditor RID={props.match?.params?.rid} />
      </div>
    )
  else
    return (
      <div className="centered-ctn">
        <div>
          <h1>Outline Editor</h1>
          {/* <p>Work in progress</p> */}
          <OutlineCSVAppContainer {...props} auth={auth} history={routerHistory} />
        </div>
      </div>
    )
}

export default OutlineCSVEditorContainer
