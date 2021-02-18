import React from "react"
import { Route } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import config from "../config"

import { AuthRequest } from "../routes/account/components/AuthRequest"
import NavBarContainer from "./NavBarContainer"
import Home from "../routes/home"
import ProfileContainer from "../routes/account/containers/Profile"
import PersonsContainer from "../routes/persons/containers/PersonsContainer"
import PersonEditContainer from "../routes/persons/containers/PersonEditContainer"
import EntityEditContainer from "../routes/entity/containers/EntityEditContainer"
import PersonView from "../routes/persons/containers/PersonView"

function App(props) {
  const { isAuthenticated, isLoading } = useAuth0()

  if (isLoading) return <span>Loading</span>
  if (config.requireAuth && !isAuthenticated) return <AuthRequest />

  return (
    <React.Fragment>
      <NavBarContainer />
      <main>
        <Route exact path="/" component={Home} />
        <Route exact path="/profile" component={ProfileContainer} />
        <Route exact path="/persons" component={PersonsContainer} />
        <Route exact path="/person/:id" component={PersonView} />
        <Route exact path="/new/:type" component={EntityEditContainer} />
        <Route exact path="/person/:id/edit" component={PersonEditContainer} />
      </main>
    </React.Fragment>
  )
}
export default App
