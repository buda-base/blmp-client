/* eslint-disable no-magic-numbers */
import React, { useEffect, useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useParams } from "react-router-dom"
import i18n from "i18next"

import config from "../../../config"

function LoginContainer() {
  const [redirect, setRedirect] = useState("/")
  const { loginWithRedirect } = useAuth0()
  const params = useParams()

  useEffect(() => {
    if (params.redirect) {
      setRedirect(params.redirect === "" || params.redirect === null ? "/" : params.redirect)
    }
  }, [params])

  useEffect(() => {
    loginWithRedirect({
      redirect_uri: `${config.SITE_URL}${decodeURIComponent(redirect)}`,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div id="login-container">
      <p>
        <span className="btn btn-light"><>{i18n.t("types.redirect")}</></span>
      </p>
    </div>
  )
}

export default LoginContainer
