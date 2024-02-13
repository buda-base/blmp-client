import React, { ErrorInfo } from "react"
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom"
import { RecoilRoot } from "recoil"
import Auth0ProviderWithHistory from "./contexts/AuthProvider"

import App from "./containers/AppContainer"
import { AuthContextWrapper } from "./contexts/AuthContext"
import { undoRef, redoRef } from "./helpers/observer"

import { Provider } from "react-redux"

import store from "./libs/bvmt/src/store"
import { debug as debugfactory } from "debug"

const debug = debugfactory("bdrc:index")

const container = document.querySelector("#root")

let ctrlDown = false

document.onkeydown = (e: KeyboardEvent) => {
  ctrlDown = e.metaKey || e.ctrlKey
  const key = e.key.toLowerCase()
  //debug("kD", e)
  if (ctrlDown && (key === "z" || key === "y")) {
    //debug("UNDO/REDO", undoRef, redoRef)

    if (!e.shiftKey) {
      if (key === "z" && undoRef && undoRef.current) undoRef.current.click()
      else if (key === "y" && redoRef && redoRef.current) redoRef.current.click()
    } else if (key === "z" && redoRef && redoRef.current) redoRef.current.click()

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

// see https://reactjs.org/docs/error-boundaries.html
class BVMTErrorBoundary extends React.Component<{ children?: React.ReactNode }, { hasError: boolean }> {

   constructor(props: { children?: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: any) {
      return { hasError: true }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      debug(error)
      debug(errorInfo)
    }

    render() {
      if (this.state.hasError) {
        return <><h1>We are sorry but the editor encountered an unexpected error.<br/>Go to <a href="/">homepage</a></h1></>
      }

      return this.props.children;
    }

}

const root = createRoot(container!)

root.render(
  <BrowserRouter>
    <BVMTErrorBoundary>
      <Provider store={store}>
        <Auth0ProviderWithHistory>
          <RecoilRoot>
            <AuthContextWrapper>
              <App />       
            </AuthContextWrapper>
          </RecoilRoot>
        </Auth0ProviderWithHistory>
      </Provider>
    </BVMTErrorBoundary>
  </BrowserRouter>
)
