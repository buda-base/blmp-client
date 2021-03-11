import React from "react"
import { BrowserRouter as Router, Route, RouteComponentProps, Switch } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import i18n from "i18next"
import { useTranslation, initReactI18next } from "react-i18next"

import config from "../config"

import { AuthRequest } from "../routes/account/components/AuthRequest"
import NavBarContainer from "./NavBarContainer"
import EntitySelector from "./EntitySelectorContainer"
import Home from "../routes/home"
import ProfileContainer from "../routes/account/containers/Profile"
import PersonsContainer from "../routes/persons/containers/PersonsContainer"
import PersonEditContainer from "../routes/persons/containers/PersonEditContainer"
import EntityEditContainer from "../routes/entity/containers/EntityEditContainer"
import PersonView from "../routes/persons/containers/PersonView"

import enTranslations from "../translations/en"

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  })

export interface IdTypeParams {
  type?: string
  id?: string
}

export interface AppProps extends RouteComponentProps<IdTypeParams> {}

function App(props: AppProps) {
  const { isAuthenticated, isLoading } = useAuth0()

  if (isLoading) return <span>Loading</span>
  if (config.requireAuth && !isAuthenticated) return <AuthRequest />

  return (
    <React.Fragment>
      <NavBarContainer />
      <EntitySelector />
      <main>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route exact path="/profile" component={ProfileContainer} />
          <Route exact path="/persons" component={PersonsContainer} />
          <Route exact path="/person/:id" component={PersonView} />
          <Route exact path="/new/:type" component={EntityEditContainer} />
          <Route exact path="/person/:id/edit" component={PersonEditContainer} />
        </Switch>
      </main>
    </React.Fragment>
  )
}
export default App
