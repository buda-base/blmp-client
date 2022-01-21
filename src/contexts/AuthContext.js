import React, { useEffect, useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useRecoilState } from "recoil"
import axios from "axios"

import config from "../config"
import { reloadProfileState, uiLangState, uiLitLangState, userIdState } from "../atoms/common"
import * as ns from "../helpers/rdf/ns"

const debug = require("debug")("bdrc:auth")

export const AuthContext = React.createContext()

export function AuthContextWrapper({ children }) {
  const { isAuthenticated, getIdTokenClaims, getAccessTokenSilently, user, logout, loading } = useAuth0()
  const [idToken, setIdToken] = useState("")
  const [profile, setProfile] = useState(null)
  const [loadingState, setLoadingState] = useState({ status: "idle", error: null })
  const [uiLang, setUiLang] = useRecoilState(uiLangState)
  const [uiLitLang, setUiLitLang] = useRecoilState(uiLitLangState)
  const [userId, setUserId] = useRecoilState(userIdState)
  const [reloadProfile, setReloadProfile] = useRecoilState(reloadProfileState)

  useEffect(() => {
    async function checkSession() {
      const idToken = await getIdTokenClaims()
      setIdToken(idToken.__raw)
    }
    if (isAuthenticated) checkSession()
    else getAccessTokenSilently()
  }, [getAccessTokenSilently, isAuthenticated])

  useEffect(() => {
    //debug("reload?",isAuthenticated,reloadProfile,loadingState.status)
    if (!reloadProfile) return

    if (isAuthenticated && idToken) fetchProfile()

    //debug("uP:",user)
    let groups
    if (
      user &&
      user["https://auth.bdrc.io/groups"] &&
      (groups = user["https://auth.bdrc.io/groups"]) &&
      !groups.includes("admin")
    ) {
      logout()
    }
  }, [idToken, isAuthenticated, user, reloadProfile])

  async function fetchProfile() {
    if (loadingState.status === "idle" || reloadProfile && loadingState.status === "fetched") {
      setLoadingState({ status: "fetching", error: null })
      await axios
        .request({
          method: "get",
          timeout: 4000,
          baseURL: config.API_BASEURL,
          url: "resource-nc/user/me",
          headers: {
            Authorization: `Bearer ${idToken}`,
            Accept: "application/json", //"text/turtle",
          },
        })
        .then(function (response) {
          let id = Object.keys(response.data),
            uiL,
            uiLitL
          if (id.length) {
            uiL = response.data[id[0]][ns.BDOU("preferredUiLang").value]
            //if (uiL?.length) uiL = uiL[0].value
            if (uiL?.length) setUiLang(uiL.map((u) => u.value))

            uiLitL = response.data[id[0]][ns.BDOU("preferredUiLiteralLangs").value]
            //if (uiLitL?.length) uiLitL = uiLitL[0].value
            if (uiLitL?.length) setUiLitLang(uiLitL.map((u) => u.value))

            id = ns.qnameFromUri(id[0])
            if (id) setUserId(id)
          }
          debug("Profile loaded", response.data, id, uiL)
          setReloadProfile(false)
          setLoadingState({ status: "fetched", error: null })
        })
        .catch(function (error) {
          debug("%O / retrying", error)
          fetchProfile()
        })
      /*
        .then(function (response) {
          debug("Profile loaded", response.data)
          setProfile(response.data)
        })
        .catch(function (error) {
          // debug("%O", error)

          if (error.response && error.response.data.output.payload.error === "Not Found") {
            // this may be normal as no profile is created until 1st order
            setLoadingState({ status: "error", error: "Customer not found" })
          } else {
            setLoadingState({ status: "error", error: "Unable to process" })
          }
        */
    }
  }

  const defaultContext = {
    profile,
    idToken,
    setProfile,
    fetchProfile,
  }

  return <AuthContext.Provider value={defaultContext}>{children}</AuthContext.Provider>
}
