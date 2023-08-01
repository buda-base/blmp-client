import React, { useEffect, useRef, useState, useCallback } from "react"
import { TextField, Button, CircularProgress, Checkbox, FormGroup, FormControlLabel, MenuItem } from "@material-ui/core"
import { useRecoilState } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import axios from "axios"
import ErrorIcon from '@material-ui/icons/Error'

import * as ns from "../helpers/rdf/ns"
import { RIDprefixState } from "../atoms/common"
import { entitiesAtom } from "./EntitySelectorContainer"
import { LangSelect } from "../routes/entity/containers/ValueList"
import config from "../config"

const debug = require("debug")("bdrc:NavBar")

function ScanRequestContainer(props) {
  const [RIDfrom, setRIDfrom] = useState("")
  const [reproductionOf, setReproductionOf] = useState("")
  const [nbVol, setNbVol] = useState(1)
  const [scanInfo, setScanInfo] = useState("")
  const [scanInfoLang, setScanInfoLang] = useState("en")
  const [errors, setErrors] = useState({ from: {}, repro: {}, io:false })
  const [spinner, setSpinner] = useState(false)
  const [message, setMessage] = useState(false)
  const [onlyNSync, setOnlyNSync] = useState(false)
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)

  const { isEtext } = props

  const { isAuthenticated, getIdTokenClaims } = useAuth0()
  const [idToken, setIdToken] = useState("")

  useEffect(() => {
    async function checkSession() {
      const idToken = await getIdTokenClaims()
      setIdToken(idToken.__raw)
    }
    if (isAuthenticated) checkSession()
  }, [isAuthenticated])

  const checkFormat = (id, str, prefix = isEtext?"ie":"w") => {
    const expr = new RegExp("^"+prefix+"(\\d|eap)[^ ]*$","i")
    if (!str || str.match(expr)) setErrors({ ...errors, io: false, [id]: {} })
    else setErrors({ ...errors, io: false, [id]: { error: true, 
      helperText: <><ErrorIcon style={{ fontSize: "20px" }} /> <i>Check RID format</i></> 
    } })
  }

  const disabled = !RIDfrom || errors["from"].error || errors.io

  const accessValues = [ "AccessOpen","AccessFairUse","AccessMixed","AccessRestrictedByQuality", 
    "AccessRestrictedByTbrc", "AccessRestrictedSealed", "AccessRestrictedTemporarily" ]

  const [access, setAccess ] = useState(accessValues[0])

  const [ric, setRIC ] = useState("true")

  const handleClick = useCallback(
    async (ev) => {
      const entityLname = RIDfrom.replace(/^[^:]+:/, "").toUpperCase()
      const entityQname = "bdr:" + entityLname

      setSpinner(true)

      let info = "scanInfo"
      if(isEtext) info = "etextInfo"
      const info_lang = info + "_lang"

      await axios
        .request({
          method: "get",
          responseType: "blob",
          timeout: 15000,
          baseURL: config.API_BASEURL,
          url: "/"+(isEtext?"etext":"scan")+"request?IDPrefix=" + RIDprefix 
          + (scanInfo ? "&"+info+"="+encodeURIComponent(scanInfo)+"&"+info_lang+"="+scanInfoLang : "")
          + "&"+(isEtext?"e":"i")+"instance=" + entityQname
          + (onlyNSync ? "&onlynonsync=true" : "")
          + "&nbvols="+nbVol
          + "&instance=bdr:"+(reproductionOf?reproductionOf:"M"+RIDfrom)
          + "&ric="+ric
          + "&access=bda:"+access
          ,
          //url: "resource-nc/user/me", // to test file download
          headers: {
            Authorization: `Bearer ${idToken}`,
            //Accept: "application/zip", // not sure we need this here?
          },
        })
        .then(async function (response) {
          debug("loaded:", response.data)

          // download file
          const temp = window.URL.createObjectURL(new Blob([response.data]))
          const link = document.createElement("a")
          link.href = temp
          let filename = (isEtext?"etext":"scan") + "-dirs-" + entityLname + ".zip"
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

          try {
            await fetch("https://ldspdi.bdrc.io/clearcache", { method: "POST" })
          } catch (e) {
            debug("error when cleaning cache:", e)
          }
        })
        .catch(function (error) {
          debug("error:", error.message)
          setErrors({ ...errors, io: error.message })
          setSpinner(false)
        })

      setSpinner(false)
    },
    [RIDfrom, RIDprefix, onlyNSync, nbVol, scanInfo, scanInfoLang, reproductionOf, ric, access, idToken, errors]
  )

  const onOnlyNSyncChangeHandler = (event: React.ChangeEvent<{ value: unknown }>) => {
    setOnlyNSync(event.target.value as boolean)
  }

  return (
    <div>
      <div>
        <h1>{isEtext?"Etext":"Scan"} Request</h1>
        <br />
        <label className="propLabel">{isEtext?"Etext":"Image"} Instance</label>
        <TextField
          InputLabelProps={{ shrink: true }}
          style={{ width: "50%", marginBottom: "10px" }}
          value={RIDfrom}
          placeholder={"RID of the "+(isEtext?"etext":"image")+" instance"}
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
        <label className="propLabel">Total number of volumes</label>
        <TextField
          type="number"
          InputLabelProps={{ shrink: true }}
          style={{ width: "35%", marginBottom: "10px" }}
          value={nbVol}
          InputProps={{ inputProps: { min: 1, max: 999 } }}
          onChange={(ev) => {
            setNbVol(ev.target.value)
          }}
        />
        <label className="propLabel">Reproduction of</label>
        <TextField
          InputLabelProps={{ shrink: true }}
          style={{ width: "50%", marginBottom: "10px" }}
          value={reproductionOf}
          placeholder={"Optional"}
          onChange={(ev) => {
            setReproductionOf(ev.target.value)
            checkFormat("repro", ev.target.value, "mw")
          }}
          {...errors["repro"]}
        />        
        <label className="propLabel">{isEtext?"Etext":"Scan"} info</label>
        <div style={{ display:"flex", alignItems:"flex-end", marginBottom: "10px" }}>
          <TextField
            InputLabelProps={{ shrink: true }}
            style={{ width: "100%" }}
            value={scanInfo}
            placeholder={"Optional"}
            onChange={(ev) => {
              setScanInfo(ev.target.value)
            }}
          />
          <LangSelect value={scanInfoLang} editable={true} onChange={(v) => {
              setScanInfoLang(v)
          }}/>
        </div>
        <label className="propLabel">Access</label>
        <TextField
          select
          className={"selector mr-2"}
          value={access}
          style={{ width: "35%", marginBottom: "10px" }}
          onChange={(ev) => setAccess(ev.target.value)}
          >
          {accessValues.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
        </TextField>
        <label className="propLabel">Restricted in China</label>
        <TextField
          select
          className={"selector mr-2"}
          value={ric}
          style={{ width: "35%", marginBottom: "10px" }}
          onChange={(ev) => setRIC(ev.target.value)}
          >
          {["true", "false"].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
        </TextField>
        <br/>
        <br/>
        <Button
          {...(disabled ? { disabled: true } : {})}
          className={"btn-rouge outlined " + (disabled ? "disabled" : "")}
          onClick={handleClick}
        >
          {spinner ? <CircularProgress size="14px" color="white" /> : (isEtext?"etext":"scan")+" request"}
        </Button>
        {errors.io != false && <p style={{ color: "red", fontStyle: "italic", fontWeight: 500 }}>{errors.io}</p>}
      </div>
    </div>
  )
}

export default ScanRequestContainer
