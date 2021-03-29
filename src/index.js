import React from "react"
import { render } from "react-dom"
import { BrowserRouter, Switch, Route } from "react-router-dom"
import { RecoilRoot } from "recoil"
import Auth0ProviderWithHistory from "./contexts/AuthProvider"

import App from "./containers/AppContainer"
import LoginContainer from "./routes/account/containers/Login"
import { AuthContextWrapper } from "./contexts/AuthContext"

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
