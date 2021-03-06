import React, { useEffect, useState } from "react"
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios"

import config from "../config"

const debug = require("debug")("bdrc:auth")

export const AuthContext = React.createContext()

export function AuthContextWrapper({ children }) {
  const { isAuthenticated, getIdTokenClaims } = useAuth0();
  const [idToken, setIdToken] = useState('');
  const [profile, setProfile] = useState(null)
  const [loadingState, setLoadingState] = useState({ status: "idle", error: null })

  useEffect(() => {
    async function checkSession() {
      const idToken = await getIdTokenClaims();
      setIdToken(idToken.__raw)
    }
    if (isAuthenticated) checkSession()
  }, [getIdTokenClaims, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && idToken) fetchProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken, isAuthenticated])

  async function fetchProfile() {
    if (loadingState.status === "idle") {
      setLoadingState({ status: "fetching", error: null })
      await axios
        .request({
          method: "get",
          timeout: 1000,
          baseURL: config.API_BASEURL,
          url: `/users/profile`,
          headers: {
            Authorization: `Bearer ${idToken}`,
          }
        })
        .then(function(response) {
          debug("Profile loaded")
          setProfile(response.data)
          setLoadingState({ status: "fetched", error: null })
        })
        .catch(function(error) {
          // debug("%O", error)

          if (error.response && error.response.data.output.payload.error === "Not Found") {
            // this may be normal as no profile is created until 1st order
            setLoadingState({ status: "error", error: "Customer not found" })
          } else {
            setLoadingState({ status: "error", error: "Unable to process" })
          }
        })
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
