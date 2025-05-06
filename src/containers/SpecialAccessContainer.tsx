import React, { useEffect, useRef, useState } from "react"
import { TextField, Button, CircularProgress } from "@material-ui/core"
import { Warning } from "@material-ui/icons"

import config from "../config"

const debug = require("debug")("bdrc:NavBar")

function SpecialAccessContainer() {
  const [email, setEmail] = useState("")
  const [RIDto, setRIDto] = useState("")
  const [errors, setErrors] = useState({ to: {}, from: {} })
  const [spinner, setSpinner] = useState(false)
  const [message, setMessage] = useState(false)

  const checkFormat = (id, str) => {
    if (id === "email") {
      if (!str || str.match(/^[^@]+@.+[.][^.]+$/i)) setErrors({ ...errors, [id]: {} })
      else setErrors({ ...errors, [id]: { error: true, helperText: <i>Check email format</i> } })
    } else {
      if (!str || str.match(/^([cpgwrti]|mw|wa|was|ut|ie|pr)(\d|eap)[^ ]*$/i)) setErrors({ ...errors, [id]: {} })
      else setErrors({ ...errors, [id]: { error: true, helperText: <i>Check RID format</i> } })
    }
  }

  const disabled = !email || !RIDto || errors["to"].error || errors["email"].error

  const handleClick = async (ev) => {
    setSpinner(true)

    /*
    setTimeout(() => {
      setMessage("not implemented yet")
      setSpinner(false)
    }, 650) // eslint-disable-line no-magic-numbers
    */

    let response
    try {
      const url = config.API_BASEURL + "specialaccess/grant"
      const idToken = localStorage.getItem("BLMPidToken")
      response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email, id: RIDto?.toUpperCase() }),
      })
      let json
      if (response.status != 200) throw new Error("" + response.status) // eslint-disable-line no-magic-numbers
      setMessage(
        <>
          Request succesfully sent
          <br />
          The following response was received:
          <br />
          <pre>
            {
              JSON.stringify(json = await response.json(), null, 3) // eslint-disable-line no-magic-numbers
            }
          </pre>
        </>
      )
      setSpinner(false)
      debug("special access log:", json)

      try {
        await fetch(config.LDSPDI_URL+"/clearcache", { method: "POST" })
      } catch (e) {
        setMessage("error when clearing cache")
      }
    } catch (e) {
      setMessage(
        <>
          Error sending request: {e.message}
          <br />
          The following response was received:
          <br />
          <pre>{JSON.stringify(await response.json(), null, 3)}</pre>
        </>
      )
      debug("error in special access:", e, email, RIDto)
      setSpinner(false)
    }
  }

  return (
    <div>
      <div>
        <h1>Special Access</h1>
        {/* 
        <p>
          <Warning/>
          &nbsp;<b><u>Please proceed with caution!</u></b>&nbsp;
          <Warning/> 
          <br/>
          <br/>
          It also modifies all the references to the original record in all the records in the database. 
          Once the operation has been done, it cannot be undone automatically.
        </p> 
        */}
        <br />
        <label className="propLabel">Email address</label>
        <TextField
          InputLabelProps={{ shrink: true }}
          style={{ width: "50%" }}
          value={email}
          placeholder={"Type here the email to be allowed to access"}
          onChange={(ev) => {
            setEmail(ev.target.value)
            //if(errors["email"]?.error) checkFormat("email", ev.target.value)
            checkFormat("email", ev.target.value)
          }}
          // onBlur={(ev) => {
          //   checkFormat("email", ev.target.value)
          // }}
          {...errors["email"]}
        />
        <label className="propLabel" style={{ display: "block", marginTop: "15px" }}>
          Scans or etexts (W or IE)
        </label>
        <TextField
          InputLabelProps={{ shrink: true }}
          style={{ width: "50%" }}
          value={RIDto}
          placeholder={"Type here the RID to be allowed access to"}
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
          {spinner ? <CircularProgress size="14px" color="white" /> : "ALLOW ACCESS"}
        </Button>
        <p>{message}</p>
      </div>
    </div>
  )
}

export default SpecialAccessContainer
