import React from "react"
import { render } from "react-dom"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { RecoilRoot } from "recoil"
import Auth0ProviderWithHistory from "./contexts/AuthProvider"

import App from "./containers/AppContainer"
import LoginContainer from "./routes/account/containers/Login"
import { AuthContextWrapper } from "./contexts/AuthContext"
import { undoRef, redoRef } from "./helpers/observer"

import { Provider } from "react-redux"

import store from "./libs/bvmt/src/store"
import { debug as debugfactory } from "debug"

const debug = debugfactory("bdrc:index")

const target = document.querySelector("#root")

let ctrlDown = false
const ctrl1 = 17,
  ctrl2 = 91,
  ctrlKey = [ctrl1, ctrl2],
  yKey = 89,
  zKey = 90

document.onkeydown = (e: KeyboardEvent) => {
  ctrlDown = e.metaKey || e.ctrlKey
  //debug("kD", e)
  if (ctrlDown && e.keyCode == zKey || ctrlDown && e.keyCode == yKey) {
    //debug("UNDO/REDO", undoRef, redoRef)

    if (!e.shiftKey) {
      if (e.keyCode === zKey && undoRef && undoRef.current) undoRef.current.click()
      else if (e.keyCode === yKey && redoRef && redoRef.current) redoRef.current.click()
    } else if (e.keyCode === zKey && redoRef && redoRef.current) redoRef.current.click()

    // DONE: fix conflict with chrome undo inside text input
    const elem = document.activeElement as HTMLElement
    if (elem) elem.blur()
    e.preventDefault()
    e.stopPropagation()
    return false
  }
}

// to fix hot reloading
// (which was only happening on compilation error not text modification etc.)
if ((module as any).hot) {
  (module as any).hot.accept()
}

render(
  <BrowserRouter>
    <Provider store={store}>
      <Auth0ProviderWithHistory>
        <RecoilRoot>
          <AuthContextWrapper>
            <Route path="/login" element={<LoginContainer />} />
            <Routes>
              <Route element={<App />} />
            </Routes>
          </AuthContextWrapper>
        </RecoilRoot>
      </Auth0ProviderWithHistory>
    </Provider>
  </BrowserRouter>,
  target
)
