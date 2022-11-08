import React, { useEffect, useRef, useState } from "react"
import { TextField, Button, CircularProgress } from "@material-ui/core"

type ErrorInfo = {
  error: boolean
  helperText: React.ReactNode
}

type Errors = {
  to?: ErrorInfo,
  from?: ErrorInfo
}

function WithdrawingEditorContainer() {
  const [RIDfrom, setRIDfrom] = useState("")
  const [RIDto, setRIDto] = useState("")
  const [errors, setErrors] = useState<Errors>({ })
  const [spinner, setSpinner] = useState(false)
  const [message, setMessage] = useState<string|null>(null)

  const checkFormat = (id: "from" | "to", str: string) => {
    if (!str || str.match(/^([cpgwrti]|mw|wa|was|ut|ie|pr)(\d|eap)[^ ]*$/i)) setErrors({ ...errors, [id]: {} })
    else setErrors({ ...errors, [id]: { error: true, helperText: <i>Check RID format</i> } })
  }

  const disabled = !RIDfrom || !RIDto || errors["to"]?.error || errors["from"]?.error

  const handleClick = async (ev: React.MouseEvent) => {
    setSpinner(true)

    setTimeout(() => {
      setMessage("not implemented yet")
      setSpinner(false)
    }, 650) // eslint-disable-line no-magic-numbers
  }

  return (
    <div>
      <div>
        <h1>Withdrawing Editor</h1>
        <p>(Work in progress)</p>
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
          {spinner ? <CircularProgress size="14px" color="primary" /> : "WITHDRAW"}
        </Button>
        <p>{message}</p>
      </div>
    </div>
  )
}

export default WithdrawingEditorContainer
