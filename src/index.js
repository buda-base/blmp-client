import React from "react"
import { render } from "react-dom"
import { BrowserRouter, Switch, Route } from "react-router-dom"
import { RecoilRoot } from "recoil"
import Auth0ProviderWithHistory from "./contexts/AuthProvider"

import App from "./containers/AppContainer"
import LoginContainer from "./routes/account/containers/Login"
import { AuthContextWrapper } from "./contexts/AuthContext"

/* // not working...

// disable browzser's native undo/redo
const ctrl1 = 17, ctrl2 = 91, ctrlKey = [ctrl1, ctrl2], yKey = 89, zKey = 90;
let ctrlDown = false;

document.body.onkeydown = function(e) {
  if (ctrlKey.includes(e.keyCode)) {
    ctrlDown = true;
  }
  if (ctrlDown && e.keyCode == zKey || ctrlDown && e.keyCode == yKey) {    
    // TODO: fix conflict with chrome undo inside text input
    const elem = document.activeElement
    if(elem) elem.blur()
    e.preventDefault();
    return false;
  }
}
document.body.onkeyup = function(e) {
  if (ctrlKey.includes(e.keyCode)) {
    ctrlDown = false;
  }
};
*/
const target = document.querySelector("#root")

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
