import React, { useEffect, useRef, useState, useCallback } from "react"
import { TextField, Button, CircularProgress, Checkbox, FormGroup, FormControlLabel } from "@material-ui/core"
import { useRecoilState } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import axios from "axios"

import * as ns from "../helpers/rdf/ns"
import { RIDprefixState } from "../atoms/common"
import { entitiesAtom } from "./EntitySelectorContainer"
import config from "../config"

const debug = require("debug")("bdrc:NavBar")

function ScanRequestContainer() {
  const [RIDfrom, setRIDfrom] = useState("")
  const [errors, setErrors] = useState({ from: {} })
  const [spinner, setSpinner] = useState(false)
  const [message, setMessage] = useState(false)
  const [onlyNSync, setOnlyNSync] = useState(false)
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)

  const { isAuthenticated, getIdTokenClaims } = useAuth0()
  const [idToken, setIdToken] = useState("")

  useEffect(() => {
    async function checkSession() {
      const idToken = await getIdTokenClaims()
      setIdToken(idToken.__raw)
    }
    if (isAuthenticated) checkSession()
  }, [isAuthenticated])

  const checkFormat = (id, str) => {
    if (!str || str.match(/^([w])(\d|eap)[^ ]*$/i)) setErrors({ ...errors, io: false, [id]: {} })
    else setErrors({ ...errors, io: false, [id]: { error: true, helperText: <i>Check RID format</i> } })
  }

  const disabled = !RIDfrom || errors["from"].error || errors.io

  const handleClick = useCallback(
    async (ev) => {
      const entityLname = RIDfrom.replace(/^[^:]+:/, "").toUpperCase()
      const entityQname = "bdr:" + entityLname

      setSpinner(true)

      await axios
        .request({
          method: "get",
          responseType: "blob",
          timeout: 4000,
          baseURL: config.API_BASEURL,
          url: entityQname + "/scanrequest?IDPrefix=" + RIDprefix + (onlyNSync ? "&onlynonsync=true" : ""),
          //url: "resource-nc/user/me", // to test file download
          headers: {
            Authorization: `Bearer ${idToken}`,
            //Accept: "application/zip", // not sure we need this here?
          },
        })
        .then(function (response) {
          debug("loaded:", response.data)

          // download file
          const temp = window.URL.createObjectURL(new Blob([response.data]))
          const link = document.createElement("a")
          link.href = temp
          let filename = "scan-dirs-" + entityLname + ".zip"
          const header = response.headers["content-disposition"]
          if (header) {
            const parts = header!.split(";")
            filename = parts[1].split("=")[1]
          }
          filename = filename.replace(/^"|"$/g, "")
          //debug("filename:",filename)
          link.setAttribute("download", filename)
          link.click()
          window.URL.revokeObjectURL(link)

          setErrors({ ...errors, io: false })
        })
        .catch(function (error) {
          debug("error:", error.message)
          setErrors({ ...errors, io: error.message })
          setSpinner(false)
        })

      setSpinner(false)
    },
    [RIDprefix, RIDfrom, onlyNSync]
  )

  const onOnlyNSyncChangeHandler = (event: React.ChangeEvent<{ value: unknown }>) => {
    setOnlyNSync(event.target.value as boolean)
  }

  return (
    <div>
      <div>
        <h1>Scan Request</h1>
        <br />
        <label className="propLabel">Image Instance</label>
        <TextField
          InputLabelProps={{ shrink: true }}
          style={{ width: "50%", marginBottom: "10px" }}
          value={RIDfrom}
          placeholder={"Type here the RID of Image Instance"}
          onChange={(ev) => {
            setRIDfrom(ev.target.value)
            checkFormat("from", ev.target.value)
          }}
          {...errors["from"]}
        />
        <FormGroup>
          <FormControlLabel
            style={{ marginBottom: "15px" }}
            label={<span style={{ fontSize: "15px" }}>only non-synced volumes</span>}
            control={
              <Checkbox
                style={{ transform: "scale(0.85)", top: "2px" }}
                type="checkbox"
                value={onlyNSync}
                onChange={onOnlyNSyncChangeHandler}
              />
            }
          />
        </FormGroup>
        <Button
          {...(disabled ? { disabled: true } : {})}
          className={"btn-rouge outlined " + (disabled ? "disabled" : "")}
          onClick={handleClick}
        >
          {spinner ? <CircularProgress size="14px" color="white" /> : "scan request"}
        </Button>
        {errors.io && <p style={{ color: "red", fontStyle: "italic", fontWeight: 500 }}>{errors.io}</p>}
      </div>
    </div>
  )
}

export default ScanRequestContainer
