/* eslint-disable no-magic-numbers */
import React, { useEffect, useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import queryString from "query-string"

import config from "../../../config"

function LoginContainer(props) {
  const [redirect, setRedirect] = useState("/")
  const { loginWithRedirect } = useAuth0()

  useEffect(() => {
    const params = queryString.parse(props.location.search)

    if (params.redirect) {
      setRedirect(params.redirect === "" || params.redirect === null ? "/" : params.redirect)
    }
  }, [props])

  useEffect(() => {
    loginWithRedirect({
      redirect_uri: `${config.SITE_URL}${redirect}`,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <p className="small">Redirecting...</p>
}

export default LoginContainer
