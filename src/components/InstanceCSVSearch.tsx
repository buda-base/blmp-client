import TextField from "@material-ui/core/TextField"
import Button from "@material-ui/core/Button"
import React, { useMemo } from "react"
import { useTranslation } from "react-i18next"
import CircularProgress from "@material-ui/core/CircularProgress"
import MuiAlert from "@material-ui/lab/Alert"
import { isNil } from "ramda"
import { useAuth0 } from "@auth0/auth0-react"
import { Link, useHistory } from "react-router-dom"
import { useRecoilState } from "recoil"

import { localCSVAtom } from "../atoms/common"

import config from "../config"

const debug = require("debug")("bdrc:menu")

const InstanceCSVSearch = (props: { isFetching: any; forVolume?: any; fetchErr: any }) => {
  const { t } = useTranslation()
  const [volume, setVolume] = React.useState("")
  const { loading } = useAuth0()

  const isRID = useMemo(() => volume.match(/^(bdr:)?w(\d|eap)/i), [volume])
  const RID = useMemo(() => volume.replace(/^bdr:/i, "").toUpperCase(), [volume])

  const [localCSV, setLocalCSV] = useRecoilState(localCSVAtom)
  
  const history = useHistory()

  const uploadCSV = (event) => {
    //debug("ev:", event, event.target.files)
    if(!event.target.files.length) return
    const reader = new FileReader()
    reader.onloadend = (data) => {
      //debug("read:",data,data.currentTarget.result)
      setLocalCSV(data.currentTarget.result)
      setTimeout(() => history.push("/outline/bdr:"+RID), 150) // eslint-disable-line
    }
    reader.readAsText(event.target.files[0])
  }

  return props.isFetching || loading ? (
    <CircularProgress />
  ) : (
    <div
      className="container mx-auto flex items-center justify-start flex-wrap"
      style={{ paddingLeft: 0, paddingTop: 0 }}
    >
      <div className="mt-10">
        <TextField
          //{...!user?{disabled:true}:{}}
          placeholder={t("instance RID")}
          margin="normal"
          InputLabelProps={{
            shrink: true,
          }}
          value={props.forVolume ? props.forVolume : volume}
          onChange={(e) => setVolume(e.target.value)}
          className="w-2/3"
          style={{
            width: 250,
            margin: "0 8px 0 0px",
          }}
        />
        <a download href={config.API_BASEURL + "outline/csv/bdr:" + RID} target="_blank" rel="noreferrer noopener">
          <Button
            //{...!user?{disabled:true}:{}}
            disabled={!isRID}
            className="btn-rouge"
            variant="contained"
            color="primary"
            style={{ marginLeft: "1em" }}
            /*
            onClick={() => {
              if (props.history?.location.pathname.startsWith("/bvmt"))
                props.history.push({ pathname: "/bvmt/" + volume })
              else window.location.search = `?instance=${volume}`
            }}
            */
          >
            {t("outline.dlCSV")}
          </Button>
        </a>
        <Link to={"/outline/bdr:" + RID}>
          <Button
            disabled={!isRID}
            className="btn-rouge"
            variant="contained"
            color="primary"
            style={{ marginLeft: "1em" }}
          >
            {t("outline.editCSV")}
          </Button>
        </Link>
        <label htmlFor="upload-csv" style={{ margin:0 }}>
          <input
            style={{ display: 'none' }}
            id="upload-csv"
            name="upload-csv"
            type="file"
            accept=".csv"
            onChange={uploadCSV}
          />
          <Button
            component="span"
            disabled={!isRID}
            className="btn-rouge"
            variant="contained"
            color="primary"
            style={{ marginLeft: "1em" }}
          >
          {t("outline.ulCSV")}
          </Button>
        </label>
        {!isNil(props.fetchErr) && (
          <MuiAlert style={{ marginTop: "2em" }} severity="error">
            {t("submitErrorMsg")}
          </MuiAlert>
        )}
      </div>
    </div>
  )
}

export default InstanceCSVSearch
