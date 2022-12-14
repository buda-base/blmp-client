import React, { useEffect, useRef, useState } from "react"
import { TextField, Button, CircularProgress } from "@material-ui/core"
import { Warning } from "@material-ui/icons"

import config from "../config"

const debug = require("debug")("bdrc:NavBar")

function WithdrawingEditorContainer() {
  const [RIDfrom, setRIDfrom] = useState("")
  const [RIDto, setRIDto] = useState("")
  const [errors, setErrors] = useState({ to: {}, from: {} })
  const [spinner, setSpinner] = useState(false)
  const [message, setMessage] = useState(false)

  const checkFormat = (id, str) => {
    if (!str || str.match(/^([cpgwrti]|mw|wa|was|ut|ie|pr)(\d|eap)[^ ]*$/i)) setErrors({ ...errors, [id]: {} })
    else setErrors({ ...errors, [id]: { error: true, helperText: <i>Check RID format</i> } })
  }

  const disabled = !RIDfrom || !RIDto || errors["to"].error || errors["from"].error

  const handleClick = async (ev) => {
    setSpinner(true)

    /*
    setTimeout(() => {
      setMessage("not implemented yet")
      setSpinner(false)
    }, 650) // eslint-disable-line no-magic-numbers
    */

    try {
      const url = config.API_BASEURL + "withdraw?from=bdr:"+RIDfrom+"&to=bdr:"+RIDto
      const idToken = localStorage.getItem("BLMPidToken")
      const response = await fetch(url, { 
        method: "POST",
        headers: {
          Accept:"application/json",
          Authorization: `Bearer ${idToken}`
        }
      })
      let json
      if(response.status != 200) throw new Error(""+response.status) // eslint-disable-line no-magic-numbers
      setMessage(<>
        Done! The following records were modified:
        <br/>
        <pre>{
          JSON.stringify(json = await response.json(),null,3) // eslint-disable-line no-magic-numbers
        }</pre>
      </>) 
      setSpinner(false)
      debug("withdraw log:",json)

      try {
        await fetch("https://ldspdi.bdrc.io/clearcache", { method: "POST" })
      } catch(e) {
        setMessage("error when clearing cache")  
      }

    } catch (e) {
      setMessage("error when withdrawing: "+e.message)
      debug("error when withdrawing:", e,RIDfrom,RIDto)
      setSpinner(false)
    }
  }

  return (
    <div>
      <div>
        <h1>Withdrawing Editor</h1>
        <p>
          <Warning/>
          &nbsp;<b><u>Please proceed with caution!</u></b>&nbsp;
          <Warning/> 
          <br/>
          <br/>
          It also modifies all the references to the original record in all the records in the database. 
          Once the operation has been done, it cannot be undone automatically.
        </p>
        <br />
        <label className="propLabel">RID to withdraw</label>
        <TextField
          InputLabelProps={{ shrink: true }}
          style={{ width: "50%" }}
          value={RIDfrom}
          placeholder={"Type here the RID to withdraw"}
          onChange={(ev) => {
            setRIDfrom(ev.target.value)
            checkFormat("from", ev.target.value)
          }}
          {...errors["from"]}
        />
        <label className="propLabel" style={{ display: "block", marginTop: "15px" }}>
          RID to redirect to
        </label>
        <TextField
          InputLabelProps={{ shrink: true }}
          style={{ width: "50%" }}
          value={RIDto}
          placeholder={"Type here the RID to redirect to"}
          onChange={(ev) => {
            setRIDto(ev.target.value)
            checkFormat("to", ev.target.value)
          }}
          {...errors["to"]}
        />
        <br />
        <br />
        <Button
          {...(disabled ? { disabled: true } : {})}
          className={"btn-rouge outlined " + (disabled ? "disabled" : "")}
          onClick={handleClick}
        >
          {spinner ? <CircularProgress size="14px" color="white" /> : "WITHDRAW"}
        </Button>
        <p>{message}</p>
      </div>
    </div>
  )
}

export default WithdrawingEditorContainer
