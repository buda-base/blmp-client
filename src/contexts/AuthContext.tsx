import React, { useEffect, useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useRecoilState } from "recoil"
import axios from "axios"

import config from "../config"
import { reloadProfileState, userQnameState, RIDprefixState } from "../atoms/common"
import { fetchTtl, atoms, ns, RDFResource, EntityGraph } from "rdf-document-editor"
import * as rdf from "rdflib"
import * as rde_config from "../helpers/config"

const debug = require("debug")("bdrc:auth")

type AuthContextType = {
  idToken: string | null,
  userQname: string | null
}

export const AuthContext = React.createContext<AuthContextType>({ idToken: null, userQname: null })

export const AuthContextWrapper = ({ children }: {children : React.ReactNode}) => {
  const { isAuthenticated, getIdTokenClaims, getAccessTokenSilently, user, logout } = useAuth0()
  const [idToken, setIdToken] = useState<string|null>(null)
  const [loadingState, setLoadingState] = useState({ status: "idle", error: null })
  const [uiLang, setUiLang] = useRecoilState(atoms.uiLangState)
  const [uiLitLang, setUiLitLang] = useRecoilState(atoms.uiLitLangState)
  const [userQname, setUserQname] = useRecoilState(userQnameState)
  const [reloadProfile, setReloadProfile] = useRecoilState(reloadProfileState)
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)

  useEffect(() => {
    async function checkSession() {
      const idToken = await getIdTokenClaims()
      if (idToken) {
        setIdToken(idToken.__raw)
        localStorage.setItem("BLMPidToken", idToken?.__raw)
        await axios.get("https://iiif.bdrc.io/setcookie", {
          headers: {
            Authorization: `Bearer ${idToken?.__raw}`,
          },
        })
      }
    }

    const tryAuth = async () => {
      if (isAuthenticated) checkSession()
      else
        try {
          await getAccessTokenSilently()
        } catch (e) {
          debug("login error:", e)
        }
    }

    tryAuth()
  }, [getAccessTokenSilently, isAuthenticated])

  useEffect(() => {
    //debug("reload?",isAuthenticated,reloadProfile,loadingState.status)
    if (!reloadProfile) return

    if (isAuthenticated && idToken) fetchProfile()

    //debug("uP:", user, demo)

    let groups
    if (
      user &&
      user["https://auth.bdrc.io/groups"] &&
      (groups = user["https://auth.bdrc.io/groups"]) &&
      !groups.some((g: string) => ["editors", "contributors"].includes(g))
    ) {
      logout({ returnTo: window.location.origin + "?notAdmin=true" })
    }
  }, [idToken, isAuthenticated, user, reloadProfile])

  async function fetchProfile() {
    if (loadingState.status === "idle" || reloadProfile && loadingState.status === "fetched") {
      setLoadingState({ status: "fetching", error: null })
      const headers = new Headers({
        Authorization: `Bearer ${idToken}`,
        Accept: "text/turtle"
      })
      const fetchProfile = fetchTtl(config.API_BASEURL+"me/focusgraph", false, headers)
      const store_etag = await fetchProfile
      const store = store_etag.store
      const userNode = store.any(null, ns.rdfType, rde_config.userProfile) as rdf.NamedNode | null
      if (userNode == null)
        throw "cannot find user in profile"
      setUserQname(rde_config.prefixMap.qnameFromUri(userNode.uri))
      localStorage.setItem("blmp_user_uri", userNode.uri)
      const userRes = new RDFResource(userNode, new EntityGraph(store, userNode.uri, rde_config.prefixMap))
      const uiLang = store.any(userNode, rde_config.preferredUiLang, null) as rdf.Literal | null
      setUiLang(uiLang ? uiLang.value : "en")
      const ridPrefix = store.any(userNode, rde_config.localNameDefaultPrefix, null) as rdf.Literal | null
      setRIDprefix(ridPrefix ? ridPrefix.value : "")
      const uiLitLangs = userRes.getPropLitValuesFromList(rde_config.preferredUiLiteralLangs)
      if (uiLitLangs) {
        const uiLitLangsStr = uiLitLangs.map((lit: rdf.Literal): string => {
          return lit.value
        })
        setUiLitLang(uiLitLangsStr)
      }
      setReloadProfile(false)
      setLoadingState({ status: "fetched", error: null })
    }
  }

  const defaultContext = {
    userQname,
    idToken
  }

  return <AuthContext.Provider value={defaultContext}>{children}</AuthContext.Provider>
}
