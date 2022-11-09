import React from "react"
import { TextField, Button, CircularProgress } from "@mui/material"
import { useTranslation } from "react-i18next"
import MuiAlert from "@material-ui/lab/Alert"
import { useAuth0 } from "@auth0/auth0-react"
import {
  useLocation,
  useNavigate,
} from "react-router-dom"

const InstanceSearch = (props: { isFetching: boolean; forVolume: string | null; fetchErr: string | null }) => {
  const { t } = useTranslation()
  const [volume, setVolume] = React.useState("")
  const { isLoading } = useAuth0()
  const navigate = useNavigate()
  const location = useLocation()

  return props.isFetching || isLoading ? (
    <CircularProgress />
  ) : (
    <div className="container mx-auto flex items-center justify-center flex-wrap" style={{ paddingTop: 60 }}>
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
            margin: "0 8px 0 8px",
          }}
        />
        <Button
          //{...!user?{disabled:true}:{}}
          variant="contained"
          color="primary"
          style={{ marginLeft: "1em" }}
          onClick={() => {
            if (location.pathname.startsWith("/bvmt"))
              navigate({ pathname: "/bvmt/" + volume })
            else window.location.search = `?instance=${volume}`
          }}
        >
          {t("submit")}
        </Button>
        {props.fetchErr && (
          <MuiAlert style={{ marginTop: "2em" }} severity="error">
            {t("submitErrorMsg")}
          </MuiAlert>
        )}
      </div>
    </div>
  )
}

export default InstanceSearch
