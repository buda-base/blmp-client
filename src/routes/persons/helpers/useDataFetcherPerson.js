import { useState, useEffect, useContext } from "react"
import axios from "axios"
import is from "is_js"

import { AuthContext } from "../../../contexts/AuthContext"

import config from "../../../config"
const debug = require("debug")("bdrc:resource")

function useDataFetcherPerson(id) {
  const [resource, setResource] = useState(null)
  const [loadingState, setLoadingState] = useState({ status: "idle", error: null })
  const { idToken } = useContext(AuthContext)

  const reset = () => {
    setResource(null)
    setLoadingState({ status: "idle", error: null })
  }

  useEffect(() => {
    async function fetchResource(q) {
      debug("Searching", q)
      setLoadingState({ status: "fetching", error: null })
      await axios
        .request({
          method: "get",
          baseURL: config.API_BASEURL,
          url: `/persons/${q}`,
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })
        .then(function (response) {
          // debug("%O", response)
          setLoadingState({ status: "fetched", error: null })
          if (response.data) setResource(response.data)
        })
        .catch(function (error) {
          if (error.response && error.response.data.output.payload.error === "Not Found") {
            setLoadingState({ status: "error", error: "No records found" })
          } else {
            setLoadingState({ status: "error", error: "Unable to process" })
          }
        })
    }
    if (idToken && id && is.alphaNumeric(id) && id.length > 1) {
      fetchResource(id.toUpperCase())
    }
  }, [id, idToken])

  return { loadingState, person: resource, reset }
}

export default useDataFetcherPerson
