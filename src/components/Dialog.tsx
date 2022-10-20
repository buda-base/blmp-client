import React, { useEffect, useState } from "react"
import { useRecoilState } from "recoil"
import { Redirect } from "react-router-dom"
import Button from "@material-ui/core/Button"
import Dialog from "@material-ui/core/Dialog"
import DialogActions from "@material-ui/core/DialogActions"
import DialogContent from "@material-ui/core/DialogContent"
import DialogContentText from "@material-ui/core/DialogContentText"
import DialogTitle from "@material-ui/core/DialogTitle"
import i18n from "i18next"

import { reloadEntityState, uiTabState } from "../atoms/common"
import { entitiesAtom } from "../containers/EntitySelectorContainer"
import { history } from "../helpers/rdf/types"

const debug = require("debug")("bdrc:entity:entitycreation")

export function DialogBeforeClose(props) {
  return (
    <div>
      <Dialog open={true}>
        <DialogTitle>youpi</DialogTitle>
        <DialogContent>
          <DialogContentText>youpla</DialogContentText>
        </DialogContent>
        <DialogActions style={{ justifyContent: "space-around" }}>
          <Button className="btn-rouge" /*onClick={handleLoad}*/ color="primary">
            <span style={{ textTransform: "none" }}>{"youpi?"}</span>
          </Button>
          <Button className="btn-rouge" /*onClick={handleNew}*/ color="primary">
            <span style={{ textTransform: "none" }}>{"youpla?"}</span>
          </Button>
        </DialogActions>
        <br />
      </Dialog>
    </div>
  )
}

export function Dialog422(props) {
  const [open, setOpen] = React.useState(props.open)
  const shape = props.shaped.split(":")[1]?.replace(/Shape$/, "")
  const [createNew, setCreateNew] = useState(false)
  const [loadNamed, setLoadNamed] = useState(false)

  debug("422:", props)

  const handleLoad = () => {
    setLoadNamed(true)
    setOpen(false)
  }

  const handleNew = () => {
    setCreateNew(true)
    setOpen(false)
  }

  if (createNew) return <Redirect to={props.newUrl} />
  else if (loadNamed) return <Redirect to={props.editUrl} />
  else
    return (
      <div>
        <Dialog open={open}>
          <DialogTitle>
            {shape} {props.named} has already been created
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Do you want to use it, or to create a new {shape} with another RID instead?
            </DialogContentText>
          </DialogContent>
          <DialogActions style={{ justifyContent: "space-around" }}>
            <Button className="btn-rouge" onClick={handleLoad} color="primary">
              Use&nbsp;<span style={{ textTransform: "none" }}>{props.named}</span>
            </Button>
            <Button className="btn-rouge" onClick={handleNew} color="primary">
              Create&nbsp;<span style={{ textTransform: "none" }}>{shape}</span>&nbsp;with another RID
            </Button>
          </DialogActions>
          <br />
        </Dialog>
      </div>
    )
}

export function Dialog412(props) {
  const [open, setOpen] = React.useState(props.open)
  const [reloadEntity, setReloadEntity] = useRecoilState(reloadEntityState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [uiTab] = useRecoilState(uiTabState)
  const entity = entities.findIndex((e, i) => i === uiTab)
  const entityUri = entities[entity]?.subject?.uri || "tmp:uri"

  debug("412:", props, reloadEntity)

  /*
  useEffect( () => {
    debug("mounting 412")

    return () => {
      debug("unmounting 412")
    }
  }, [])
  */

  const handleReload = () => {
    if (props.entityQname) {
      if (history && history[entityUri]) delete history[entityUri]
      const newEntities = [...entities]
      newEntities[entity] = { ...newEntities[entity], subject: null }
      setEntities(newEntities)

      setReloadEntity(props.entityQname)
    }
  }

  const handleNew = () => {
    //setCreateNew(true)
    //setOpen(false)
  }
  /*
  if (createNew) return <Redirect to={props.newUrl} />
  else if (loadNamed) return <Redirect to={props.editUrl} />
  else
  */
  return (
    <div>
      <Dialog open={open}>
        <DialogTitle></DialogTitle>
        <DialogContent>
          <DialogContentText>
            {i18n.t("error.newer")}
            <br />
            {i18n.t("error.lost")}
          </DialogContentText>
        </DialogContent>
        <DialogActions style={{ justifyContent: "space-around" }}>
          <Button className="btn-rouge" onClick={handleReload} color="primary">
            Reload
          </Button>
          {/* <Button className="btn-rouge" onClick={handleNew} color="primary">
              LATER 
            </Button> */}
        </DialogActions>
        <br />
      </Dialog>
    </div>
  )
}
