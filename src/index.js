import React from "react"
import { render } from "react-dom"
import { BrowserRouter, Switch, Route } from "react-router-dom"
import { RecoilRoot } from "recoil"
import Auth0ProviderWithHistory from "./contexts/AuthProvider"

import App from "./containers/AppContainer"
import LoginContainer from "./routes/account/containers/Login"
import { AuthContextWrapper } from "./contexts/AuthContext"

import { undoRef, redoRef } from "./routes/helpers/observer"

const debug = require("debug")("bdrc:root")

const target = document.querySelector("#root")

let ctrlDown = false
const ctrl1 = 17,
  ctrl2 = 91,
  ctrlKey = [ctrl1, ctrl2],
  yKey = 89,
  zKey = 90

document.onkeydown = (e: React.KeyboardEvent) => {
  ctrlDown = e.metaKey || e.ctrlKey
  //debug("kD", e)
  if (ctrlDown && e.keyCode == zKey || ctrlDown && e.keyCode == yKey) {
    //debug("UNDO/REDO", undoRef, redoRef)

    if (!e.shiftKey) {
      if (e.keyCode === zKey && undoRef.current) undoRef.current.click()
      else if (e.keyCode === yKey && redoRef.current) redoRef.current.click()
    } else if (e.keyCode === zKey && redoRef.current) redoRef.current.click()

    // DONE: fix conflict with chrome undo inside text input
    const elem = document.activeElement //as HTMLElement
    if (elem) elem.blur()
    e.preventDefault()
    e.stopPropagation()
    return false
  }
}

// to fix hot reloading
// (which was only happening on compilation error not text modification etc.)
if (module.hot) {
  module.hot.accept()
}

render(
  <BrowserRouter>
    <Auth0ProviderWithHistory>
      <AuthContextWrapper>
        <Route exact path="/login" component={LoginContainer} />
        <RecoilRoot>
          <Switch>
            <Route component={App} />
          </Switch>
        </RecoilRoot>
      </AuthContextWrapper>
    </Auth0ProviderWithHistory>
  </BrowserRouter>,
  target
)
