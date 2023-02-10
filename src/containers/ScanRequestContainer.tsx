import React, { useEffect, useState, useCallback } from "react"
import { TextField, Button, CircularProgress, Checkbox, FormGroup, FormControlLabel, MenuItem } from "@material-ui/core"
import { useRecoilState } from "recoil"
import { useAuth0 } from "@auth0/auth0-react"
import axios from "axios"
import ErrorIcon from '@material-ui/icons/Error'

import { LangSelect, RDEProps } from "rdf-document-editor"

import { RIDprefixState, idTokenAtom } from "../atoms/common"
import config from "../config"
import { debug as debugfactory } from "debug"

const debug = debugfactory("bdrc:ScanRequestContainer")

type ErrorInfo = {
  error: boolean
  helperText?: React.ReactNode
}

type Errors = {
  from?: ErrorInfo,
  io?: ErrorInfo,
  repro?: ErrorInfo
}

function ScanRequestContainer(props: RDEProps) {
  const configRDE = props.config
  const [RIDfrom, setRIDfrom] = useState<string|null>(null)
  const [reproductionOf, setReproductionOf] = useState("")
  const [nbVol, setNbVol] = useState(1)
  const [scanInfo, setScanInfo] = useState("")
  const [scanInfoLang, setScanInfoLang] = useState("en")
  const [errors, setErrors] = useState<Errors>({})
  const [spinner, setSpinner] = useState(false)
  const [onlyNSync, setOnlyNSync] = useState(false)
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)

  const { isAuthenticated, getIdTokenClaims } = useAuth0()
  const [idToken, setIdToken] = useRecoilState(idTokenAtom)

  useEffect(() => {
    async function checkSession() {
      const idToken = await getIdTokenClaims()
      if (idToken)
        setIdToken(idToken.__raw)
    }
    if (isAuthenticated) checkSession()
  }, [isAuthenticated])

  const checkFormat = (id = "", str = "", prefix = "w") => {
    const expr = new RegExp("^"+prefix+"(\\d|eap)[^ ]*$","i")
    if (!str || str.match(expr)) setErrors({ ...errors, io: { error: false }, [id]: {} })
    else setErrors({ ...errors, io: { error: false }, [id]: { error: true, 
      helperText: <><ErrorIcon style={{ fontSize: "20px" }} /> <i>Check RID format</i></> 
    } })
  }

  const disabled = !RIDfrom || errors.from?.error || errors.io?.error || errors.repro?.error

  const accessValues = [ "AccessOpen","AccessFairUse","AccessMixed","AccessRestrictedByQuality", 
    "AccessRestrictedByTbrc", "AccessRestrictedSealed", "AccessRestrictedTemporarily" ]

  const [access, setAccess ] = useState(accessValues[0])

  const [ric, setRIC ] = useState("true")

  const handleClick = useCallback(
    async (ev: React.MouseEvent) => {
      if (!RIDfrom)
        return
      const entityLname = RIDfrom.replace(/^[^:]+:/, "").toUpperCase()
      const entityQname = "bdr:" + entityLname

      setSpinner(true)

      await axios
        .request({
          method: "get",
          responseType: "blob",
          timeout: 15000,
          baseURL: config.API_BASEURL,
          url: "/scanrequest?IDPrefix=" + RIDprefix 
          + (onlyNSync ? "&onlynonsync=true" : "")
          + "&nbvols="+nbVol
          + (scanInfo ? "&scaninfo="+encodeURIComponent(scanInfo)+"&scaninfo_lang="+scanInfoLang : "")
          + "&instance=bdr:"+(reproductionOf?reproductionOf:"M"+RIDfrom).toUpperCase()
          + "&iinstance=" + entityQname
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
          window.URL.revokeObjectURL(link.href)

          setErrors({ ...errors, io: { error: false } })

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
        <h1>Scan Request</h1>
        <br />
        <label className="propLabel">Image Instance</label>
        <TextField
          InputLabelProps={{ shrink: true }}
          style={{ width: "50%", marginBottom: "10px" }}
          value={RIDfrom}
          placeholder={"RID of the image instance"}
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
            setNbVol(Number(ev.target.value))
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
        <label className="propLabel">Scan info</label>
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
          <LangSelect config={configRDE} value={scanInfoLang} editable={true} onChange={(v:string) => {
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
          {spinner ? <CircularProgress size="14px" color="primary" /> : "scan request"}
        </Button>
        {errors.io?.error != false && <p style={{ color: "red", fontStyle: "italic", fontWeight: 500 }}>{errors.io}</p>}
      </div>
    </div>
  )
}

export default ScanRequestContainer
