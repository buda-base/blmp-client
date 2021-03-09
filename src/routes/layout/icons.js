import React from "react"
import { Img } from "react-image"
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline"
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline"
export { default as ErrorIcon } from "@material-ui/icons/Error"

export const PersonIcon = (props) => <Img src="/icons/person.svg" {...props} />
export const WorkIcon = (props) => <Img src="/icons/work.svg" {...props} />
export const PlaceIcon = (props) => <Img src="/icons/place.svg" {...props} />
export const VersionIcon = (props) => <Img src="/icons/instance.svg" {...props} />

export const AddIcon = AddCircleOutlineIcon
export const RemoveIcon = RemoveCircleOutlineIcon
