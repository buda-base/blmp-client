import React from "react"
import { Img } from "react-image"
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline"
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline"
export { default as ErrorIcon } from "@material-ui/icons/Error"
export { default as CloseIcon } from "@material-ui/icons/Close"
export { default as SearchIcon } from "@material-ui/icons/FindReplace"
export { default as LaunchIcon } from "@material-ui/icons/Launch"
export { default as InfoIcon } from "@material-ui/icons/Info"
export { default as InfoOutlinedIcon } from "@material-ui/icons/InfoOutlined"
export { default as SettingsIcon } from "@material-ui/icons/Settings"

export const PersonIcon = (props) => <Img src="/icons/person.svg" {...props} />
export const WorkIcon = (props) => <Img src="/icons/work.svg" {...props} />
export const PlaceIcon = (props) => <Img src="/icons/place.svg" {...props} />
export const VersionIcon = (props) => <Img src="/icons/instance.svg" {...props} />

export const AddIcon = AddCircleOutlineIcon
export const RemoveIcon = RemoveCircleOutlineIcon
