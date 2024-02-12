import React, { useEffect, useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useRecoilState } from "recoil"
import axios from "axios"

import config from "../config"
import { reloadProfileState, userIdState, RIDprefixState, idTokenAtom, demoAtom } from "../atoms/common"
import { fetchTtl, atoms, ns, RDFResource, EntityGraph } from "rdf-document-editor"
import * as rdf from "rdflib"
import * as rde_config from "../helpers/config"

const debug = require("debug")("bdrc:auth")

type AuthContextType = {
  idToken: string | null
}

export const AuthContext = React.createContext<AuthContextType>({ idToken: null })

export const AuthContextWrapper = ({ children }: {children : React.ReactNode}) => {
  const { isAuthenticated, getIdTokenClaims, getAccessTokenSilently, user, logout } = useAuth0()
  const [idToken, setIdToken] = useState("")
  const [profile, setProfile] = useState(null)
  const [loadingState, setLoadingState] = useState({ status: "idle", error: null })
  const [uiLang, setUiLang] = useRecoilState(atoms.uiLangState)
  const [uiLitLang, setUiLitLang] = useRecoilState(atoms.uiLitLangState)
  const [userId, setUserId] = useRecoilState(userIdState)
  const [reloadProfile, setReloadProfile] = useRecoilState(reloadProfileState)
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)
  const [demo, setDemo] = useRecoilState(demoAtom)

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
          //debug("did not login silently", e)
        }
    }

    tryAuth()
  }, [getAccessTokenSilently, isAuthenticated])

  useEffect(() => {
    //debug("reload?",isAuthenticated,reloadProfile,loadingState.status)
    if (!reloadProfile) return

    if (isAuthenticated && idToken || demo) fetchProfile()

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
  }, [idToken, isAuthenticated, user, reloadProfile, demo])

  async function fetchProfile() {
    if (loadingState.status === "idle" || reloadProfile && loadingState.status === "fetched") {
      setLoadingState({ status: "fetching", error: null })
      let baseURL = config.API_BASEURL
      let url = "me/focusgraph"
      if (demo) {
        baseURL = "/examples/"
        url = "DemoUser.json"
      }
      await axios
        .request({
          method: "get",
          timeout: 4000,
          baseURL,
          url,
          headers: {
            ...!demo ? { Authorization: `Bearer ${idToken}` } : {},
            Accept: "application/json", //"text/turtle",
          },
        })
        .then(function (response) {
          let id:string|string[] = Object.keys(response.data),
            uiL,
            uiLitL,
            prefix
          const idx = id.findIndex((k) => k.includes("/user/U"))
          if (id.length) {
            //debug("Profile loaded", response.data, id, idx, id[idx])
            uiL = response.data[id[idx]][rde_config.BDOU("preferredUiLang").value]
            //if (uiL?.length) uiL = uiL[0].value
            if (uiL?.length) setUiLang(uiL.map((u:any) => u.value))

            uiLitL = response.data[id[idx]][rde_config.BDOU("preferredUiLiteralLangs").value]
            //if (uiLitL?.length) uiLitL = uiLitL[0].value
            if (uiLitL?.length) {
              let head = uiLitL[0].value
              const list = [],
                first = ns.RDF("first").value,
                rest = ns.RDF("first").value,
                nil = ns.RDF("nil").value
              do {
                if (head && response.data[head]) {
                  if (response.data[head][first]?.length) {
                    list.push(response.data[head][first][0].value)
                  }
                  if (response.data[head][rest]?.length && response.data[head][rest][0].value !== nil) {
                    head = response.data[head][rest][0].value
                  }
                } else head = null
              } while (head)
              //debug("list:",list)
              if (list.length) setUiLitLang(list)
            }

            prefix = response.data[id[idx]][rde_config.BDOU("localNameDefaultPrefix").value]
            //debug("RIDp:",prefix,response.data[id[idx]],ns.BDOU("localNameDefaultPrefix").value)
            if (prefix?.length && prefix[0].value) setRIDprefix(prefix[0].value)
            else setRIDprefix("")

            id = rde_config.prefixMap.qnameFromUri(id[idx])
            if (id) setUserId(id)
          }
          debug("Profile loaded", response.data, id, uiL)
          setReloadProfile(false)
          setLoadingState({ status: "fetched", error: null })
        })
        .catch(function (error) {
          debug("%O / retrying", error)
          if (!demo) fetchProfile()
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
