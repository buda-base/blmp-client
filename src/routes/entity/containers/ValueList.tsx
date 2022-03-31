import React, { useEffect, FC, ChangeEvent, useState, useRef, useLayoutEffect } from "react"
import PropTypes from "prop-types"
import * as rdf from "rdflib"
import {
  LiteralWithId,
  Subject,
  Value,
  ObjectType,
  RDFResourceWithLabel,
  ExtRDFResourceWithLabel,
  errors,
  history,
  noneSelected,
} from "../../../helpers/rdf/types"
import { PropertyShape } from "../../../helpers/rdf/shapes"
import * as ns from "../../../helpers/rdf/ns"
import { generateSubnode, reserveLname } from "../../../helpers/rdf/construct"
import { useRecoilState, useSetRecoilState, useRecoilValue, atomFamily, atom, selectorFamily } from "recoil"
import { makeStyles } from "@material-ui/core/styles"
import { TextField, MenuItem, Tooltip, IconButton, InputLabel, Select } from "@material-ui/core"
import { getId, replaceItemAtIndex, removeItemAtIndex } from "../../../helpers/atoms"
import {
  AddIcon,
  RemoveIcon,
  ErrorIcon,
  CloseIcon,
  VisibilityIcon,
  VisibilityOffIcon,
  MDIcon,
  EditIcon,
  KeyboardIcon,
  HelpIcon,
} from "../../layout/icons"
import i18n from "i18next"
import { getHistoryStatus } from "../../../containers/AppContainer"
import PropertyContainer from "./PropertyContainer"
import { langs, ValueByLangToStrPrefLang, langsWithDefault } from "../../../helpers/lang"
import {
  uiLangState,
  uiLitLangState,
  uiEditState,
  uiUndosState,
  orderedByPropSelector,
  initListAtom,
  RIDprefixState,
  EDTFtoOtherFieldsSelector,
  orderedNewValSelector,
} from "../../../atoms/common"
import ResourceSelector from "./ResourceSelector"
import { entitiesAtom, Entity, EditedEntityState } from "../../../containers/EntitySelectorContainer"

import { fromWylie } from "jsewts"
import MDEditor, { commands } from "@uiw/react-md-editor"

//import edtf, { parse } from "edtf/dist/../index.js" // finally got it to work!! not in prod...
import edtf, { parse } from "edtf" // see https://github.com/inukshuk/edtf.js/issues/36#issuecomment-1073778277

const debug = require("debug")("bdrc:entity:container:ValueList")

export const MinimalAddButton: FC<{
  add: React.MouseEventHandler<HTMLButtonElement>
  className: string
  disable?: boolean
}> = ({ add, className, disable }) => {
  return (
    <div
      className={
        "minimalAdd " + "disable_" + disable + (className !== undefined ? className : " text-right")
      } /*style={{ width: "100%" }}*/
    >
      <button className="btn btn-link ml-2 px-0" onClick={add} {...(disable ? { disabled: true } : {})}>
        <AddIcon />
      </button>
    </div>
  )
}

export const BlockAddButton: FC<{ add: React.MouseEventHandler<HTMLButtonElement>; label?: string; count: number }> = ({
  add,
  label,
  count = 1,
}) => {
  const [n, setN] = useState(1)
  const [disable, setDisable] = useState(false)

  const handleAdd = async (e) => {
    setDisable(true)
    await add(e, n)
    setDisable(false)
  }

  return (
    <div
      className="blockAdd text-center pb-1 mt-3"
      style={{ width: "100%", ...count > 1 ? { display: "flex" } : {} }}
    >
      <button
        className="btn btn-sm btn-block btn-outline-primary px-0"
        style={{ boxShadow: "none", pointerEvents: disable ? "none" : "auto" }}
        onClick={handleAdd}
        disabled={disable}
      >
        {i18n.t("general.add_another", { val: label, count })}
        &nbsp;
        <AddIcon />
      </button>
      {count > 1 && (
        <TextField
          label={i18n.t("general.add_nb", { val: label })}
          style={{ width: 200 }}
          value={n}
          className="ml-2"
          type="number"
          InputLabelProps={{ shrink: true }}
          onChange={(e) => setN(e.target.value)}
          InputProps={{ inputProps: { min: 1, max: 500 } }}
          /*
        {...(error
          ? {
              helperText: (
                <React.Fragment>
                  <ErrorIcon style={{ fontSize: "20px", verticalAlign: "-7px" }} />
                  <i> {error}</i>
                </React.Fragment>
              ),
              error: true,
            }
          : {})}
        {...(!editable ? { disabled: true } : {})}
        */
        />
      )}
    </div>
  )
}

export const OtherButton: FC<{ onClick: React.MouseEventHandler<HTMLButtonElement>; label: string }> = ({
  onClick,
  label,
}) => {
  return (
    <div className="blockAdd text-center pb-1" style={{ margin: "0 15px" }}>
      <button
        className="btn btn-sm btn-block btn-outline-primary mb-2 px-0 py-2"
        style={{ boxShadow: "none" }}
        onClick={onClick}
      >
        {label}
      </button>
    </div>
  )
}

/* // breaks history
export const updateEntitiesRDF = (
  subject: Subject,
  updateFunction: (rdf: string) => Subject,
  rdf: string,
  entities: Array<Entity>,
  setEntities: (newEntities: Array<Entity>) => void
) => {
  debug("update with RDF:", rdf)
  const nEnt = entities.findIndex((e) => e.subjectQname === subject.qname)
  if (nEnt >= 0 && entities[nEnt].subject) {
    const subject = entities[nEnt].subject
    if (subject) {
      const newSubject = updateFunction.call(subject, rdf)
      const newEntities = [...entities]
      newEntities[nEnt] = { ...entities[nEnt], subject: newSubject }
      setEntities(newEntities)
    }
  }
}
*/

const generateDefault = async (
  property: PropertyShape,
  parent: Subject,
  RIDprefix: string,
  idToken: string | null,
  val = "",
  n = 1
): Value | Value[] => {
  //debug("genD:", property, parent)
  switch (property.objectType) {
    case ObjectType.ResExt:
      /*
      // to speed up dev/testing
      return new ExtRDFResourceWithLabel("bdr:P2JM192", { "en":"Delek Gyatso", "bo-x-ewts":"bde legs rgya mtsho/" },
        { PersonBirth: { onYear: "1724" }, PersonDeath: { onYear: "1777" } })
      */

      // TODO might be a better way but "" isn't authorized
      return new ExtRDFResourceWithLabel("tmp:uri", {})
      break
    case ObjectType.Facet:
      if (property.targetShape == null) throw "no target shape for " + property.uri
      return generateSubnode(property.targetShape, parent, RIDprefix, idToken, n)
      break
    case ObjectType.ResInList:
      // if a select property is not required, we don't select anything by default
      if (!property.minCount) return noneSelected
      // else we select the first one automatically
      const propIn: Array<Value> | null = property.in
      if (!propIn) throw "can't find a list for " + property.uri
      return propIn[0]
      break
    case ObjectType.LitInList:
      if (!property.minCount) {
        const datatype = property.datatype?.value
        if (datatype === ns.RDF("langString").value) {
          // TODO: this should be a user preference, not urgent
          return new LiteralWithId("", property?.defaultLanguage ? property.defaultLanguage : "bo-x-ewts")
        } else {
          return new LiteralWithId("", null, property.datatype ? property.datatype : undefined)
        }
      }
      const propInLit: Array<Value> | null = property.in
      if (!propInLit) throw "can't find a list for " + property.uri
      return propInLit[0]
      break
    case ObjectType.Literal:
    default:
      const defaultValue = property.defaultValue as rdf.Literal | null
      if (defaultValue != null)
        return new LiteralWithId(defaultValue.value, defaultValue.language, defaultValue.datatype)
      const datatype = property.datatype?.value
      if (datatype === ns.RDF("langString").value) {
        // TODO: this should be a user preference, not urgent
        return new LiteralWithId("", property?.defaultLanguage ? property.defaultLanguage : "bo-x-ewts")
      } else if (datatype === ns.XSD("integer").value) {
        return new LiteralWithId(val, null, property.datatype ? property.datatype : undefined)
      } else {
        return new LiteralWithId("", null, property.datatype ? property.datatype : undefined)
      }
      break
  }
}

/**
 * List component
 */

const ValueList: FC<{
  subject: Subject
  property: PropertyShape
  embedded?: boolean
  force?: boolean
  editable: boolean
  owner?: Subject
  topEntity?: Subject
  shape: Shape
}> = ({ subject, property, embedded, force, editable, owner, topEntity, shape }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [unsortedList, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const [uiLang] = useRecoilState(uiLangState)
  const [idToken, setIdToken] = useState(localStorage.getItem("BLMPidToken"))
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)
  const propLabel = ValueByLangToStrPrefLang(property.prefLabels, uiLang)
  const helpMessage = ValueByLangToStrPrefLang(property.helpMessage, uiLang)
  const [undos, setUndos] = useRecoilState(uiUndosState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const sortOnPath = property?.sortOnProperty?.value
  const orderedList = useRecoilValue(
    orderedByPropSelector({
      atom: subject.getAtomForProperty(property.path.sparqlString),
      propertyPath: sortOnPath,
      //order: "desc" // default is "asc"
    })
  )
  let list = unsortedList
  if (orderedList.length) list = orderedList

  const withOrder = shape.properties.filter((p) => p.sortOnProperty?.value === property.path.sparqlString)
  let newVal = useRecoilValue(
    orderedNewValSelector({
      atom: withOrder.length
        ? (topEntity ? topEntity : subject).getAtomForProperty(withOrder[0].path.sparqlString)
        : false,
      propertyPath: property.path.sparqlString,
      //order: "desc" // default is "asc"
    })
  )
  if (newVal != "") {
    if (property.minInclusive && newVal < property.minInclusive) newVal = property.minInclusive
    if (property.maxInclusive && newVal > property.maxInclusive) newVal = property.maxInclusive
  }

  //debug("vL:", newVal,property.qname, list)

  const updateEntityState = (status: EditedEntityState, id: string, removingFacet = false) => {
    if (id === undefined) throw new Error("id undefined")
    const entityQname = topEntity ? topEntity.qname : subject.qname
    const undo = undos[ns.uriFromQname(entityQname)]
    const hStatus = getHistoryStatus(ns.uriFromQname(entityQname))
    //debug("undo:", undo, hStatus, history, entityQname, undos)
    const n = entities.findIndex((e) => e.subjectQname === entityQname)
    if (n > -1) {
      const ent: Entity = entities[n]
      if (status === EditedEntityState.Error) {
        //debug("error:", errors, status, n, ent, property.qname, id)
        if (ent.state != status) {
          const newEntities = [...entities]
          newEntities[n] = { ...entities[n], state: status }
          setEntities(newEntities)
        }
        if (!errors[ent.subjectQname]) errors[ent.subjectQname] = {}
        errors[ent.subjectQname][subject.qname + ";" + property.qname + ";" + id] = true
      } else if (status !== EditedEntityState.Error) {
        // DONE: update status to NeedsSaving for newly created entity and not for loaded entity
        status =
          ent.alreadySaved && (!undo || undo.prev && !undo.prev.enabled)
            ? EditedEntityState.Saved
            : EditedEntityState.NeedsSaving

        //debug("no error:", status, n, ent, errors, property.qname, id)
        if (ent.state != status) {
          //debug("status:", ent.state, status)
          if (removingFacet) {
            //debug("rf:", id)
            if (errors[ent.subjectQname]) {
              const keys = Object.keys(errors[ent.subjectQname])
              for (const k of keys) {
                if (k.startsWith(id)) delete errors[ent.subjectQname][k]
              }
            }
          } else if (
            errors[ent.subjectQname] &&
            errors[ent.subjectQname][subject.qname + ";" + property.qname + ";" + id]
          ) {
            delete errors[ent.subjectQname][subject.qname + ";" + property.qname + ";" + id]
          }
          if (!errors[ent.subjectQname] || !Object.keys(errors[ent.subjectQname]).length) {
            const newEntities = [...entities]
            newEntities[n] = { ...entities[n], state: status }
            setEntities(newEntities)
            //debug("newEnt:",newEntities[n].state)
          }
        }
      }
    }
  }

  const alreadyHasEmptyValue: () => boolean = (): boolean => {
    for (const val of list) {
      if (val instanceof LiteralWithId && val.value === "") return true
      if (val instanceof RDFResourceWithLabel && val.node.value === "tmp:none") return true
    }
    return false
  }

  // TODO: handle the creation of a new value in a more sophisticated way (with the iframe and such)
  const canAdd =
    !editable ||
    alreadyHasEmptyValue() ||
    property.readOnly && property.readOnly === true ||
    property.displayPriority && property.displayPriority > 1
      ? false
      : property.objectType != ObjectType.ResExt && property.maxCount
      ? list.length < property.maxCount
      : true

  const canDel = (!property.minCount || property.minCount < list.length) && !property.readOnly && editable

  // DONE save multiple external resource for property
  const onChange: (value: RDFResourceWithLabel, idx: number, removeFirst: boolean | undefined) => void = (
    value: RDFResourceWithLabel,
    idx: number,
    removeFirst: boolean | undefined
  ) => {
    const newList = replaceItemAtIndex(list, idx, value)
    //if(removeFirst) newList.shift()
    setList(newList)
  }

  // DONE prevent adding same resource twice
  let exists: (uri: string) => boolean = () => false
  useEffect(() => {
    exists = (uri: string): boolean => {
      for (const val of list) {
        if (val instanceof RDFResourceWithLabel && (val.qname === uri || val.uri === uri)) return true
      }
      //debug("not found "+uri+" in ",list)
      return false
    }
  }, [list])

  let firstValueIsEmptyField = true

  useEffect(() => {
    //debug("vL/effect:",subject.qname,property.qname,list)

    // TODO: check maxCount
    if (list.length) {
      const first = list[0]
      if (first instanceof ExtRDFResourceWithLabel && first.uri !== "tmp:uri" && first.uri !== "tmp:none")
        firstValueIsEmptyField = false
    }

    // reinitializing the property values atom if it hasn't been initialized yet
    const vals: Array<Value> | null = subject.getUnitializedValues(property)
    if (vals && vals.length) {
      if (property.minCount && vals.length < property.minCount) {
        const setListAsync = async () => {
          const res = await generateDefault(property, subject, RIDprefix, idToken, newVal)
          // dont store empty value autocreation
          if (topEntity) topEntity.noHisto()
          else if (owner) owner.noHisto()
          else subject.noHisto()
          //debug("setNoH:1a",subject,owner,topEntity)
          setList([...vals, res])
        }
        setListAsync()
      } else {
        //debug("setNoH:1b",subject,owner,topEntity)
        setList(vals)
      }
    } else if (
      property.objectType != ObjectType.ResInList &&
      property.objectType != ObjectType.LitInList &&
      property.objectType != ObjectType.Facet &&
      (!property.displayPriority ||
        property.displayPriority === 0 ||
        property.displayPriority === 1 && (list.length || force)) &&
      (property.minCount && list.length < property.minCount || !list.length || !firstValueIsEmptyField) &&
      (!property.maxCount || property.maxCount >= list.length)
    ) {
      if (!firstValueIsEmptyField) {
        const setListAsync = async () => {
          const res = await generateDefault(property, subject, RIDprefix, idToken, newVal)
          // dont store empty value autocreation
          if (topEntity) topEntity.noHisto()
          else if (owner) owner.noHisto()
          else subject.noHisto()
          //debug("setNoH:2",subject,owner,topEntity)
          setList((oldList) => [res, ...oldList])
        }
        setListAsync()
      } else {
        const setListAsync = async () => {
          const res = await generateDefault(property, subject, RIDprefix, idToken, newVal)
          // dont store empty value autocreation
          if (topEntity) topEntity.noHisto()
          else if (owner) owner.noHisto()
          else subject.noHisto()
          //debug("setNoH:2",subject,owner,topEntity)
          setList((oldList) => [...oldList, res])
        }
        setListAsync()
      }
    } else if (property.objectType == ObjectType.Facet && property.minCount && list.length < property.minCount) {
      const setListAsync = async () => {
        const res = await generateDefault(property, subject, RIDprefix, idToken, newVal)
        // dont store empty value autocreation
        if (topEntity) topEntity.noHisto()
        else if (owner) owner.noHisto()
        else subject.noHisto()
        //debug("setNoH:3",subject,owner,topEntity)
        setList((oldList) => [res, ...oldList])
      }
      setListAsync()
    } else if (
      property.objectType != ObjectType.ResInList &&
      property.objectType != ObjectType.LitInList &&
      property.displayPriority &&
      property.displayPriority === 1 &&
      list.length === 1 &&
      !force
    ) {
      //debug("setNoH:4",subject,owner,topEntity)
      // DONE: comment: what does it do?
      // guess: it removes the first tmp:uri first object of hidden properties
      // answer: indeed it removes empty value when displayPriority is 1
      // but let's keep value then hide it in CSS when needed (fixes #16)
      // if (firstValueIsEmptyField) setList([])
    } else if (
      !list.length &&
      (property.objectType == ObjectType.ResInList || property.objectType == ObjectType.LitInList)
    ) {
      // this makes sure that there's at least one value for select forms, and the value is either
      // the first one (when it's mandatory that there's a value), or tmp:none
      const setListAsync = async () => {
        const res = await generateDefault(property, subject, RIDprefix, idToken, newVal)
        if (topEntity) topEntity.noHisto()
        else if (owner) owner.noHisto()
        else subject.noHisto()
        //debug("setNoH:5",subject,owner,topEntity)
        setList([res])
      }
      setListAsync()
    }
    //debug("end/vL/effect")
  }, [subject, list, force])

  let addBtn = property.objectType === ObjectType.Facet

  //debug("prop:", property.qname, subject.qname, list) //property, force)

  const isEmptyValue = (val: Value): boolean => {
    if (val instanceof RDFResourceWithLabel) {
      return val.uri === "tmp:uri" || val.uri === "tmp:none"
    } else if (val instanceof LiteralWithId) {
      // remove language part to fix hiding secondary properties in iinstance/volumes
      return val.value === "" // && !val.language
      //|| property.defaultValue === "bds:ImagegroupShape-volumePagesTbrcIntro" && val.value === "0" // no need
    }
    return false
  }
  const isErrorValue = (val: Value): boolean => {
    // TODO: to be continue (or not? conflicts with hiding secondary properties, removing)
    //       + not sure it should be hidden (in case of empty Person Name) but Names group should not be closed as well
    //if (val instanceof LiteralWithId && property?.datatype?.value === ns.RDF("langString").value) return !val.value

    if (val instanceof LiteralWithId && errors[topEntity ? topEntity.qname : subject.qname]) {
      const errorKeys = Object.keys(errors[topEntity ? topEntity.qname : subject.qname])
      return errorKeys.some((k) => k.endsWith(";" + val.id))
    }

    return false
  }

  const hasNonEmptyValue = list.some((v) => !isEmptyValue(v) || isErrorValue(v))

  /* eslint-disable no-magic-numbers */
  const showLabel =
    !property.displayPriority ||
    property.displayPriority === 0 ||
    property.displayPriority === 1 && (force || list.length > 1 || hasNonEmptyValue) ||
    property.displayPriority === 2 && (list.length >= 1 || hasNonEmptyValue)

  // scroll back to top when loosing focus
  const scrollElem = useRef<null | HTMLDivElement>(null)
  const [edit, setEdit] = useRecoilState(uiEditState)
  useEffect(() => {
    if (property?.group?.value !== edit && scrollElem?.current) {
      scrollElem.current.scrollTo({ top: 0, left: 0, behavior: "smooth" })
    }
  }, [edit])

  const hasEmptyExtEntityAsFirst =
    list.length > 0 &&
    list[0] instanceof RDFResourceWithLabel &&
    property.objectType == ObjectType.ResExt &&
    list[0].uri === "tmp:uri"

  const titleCase = (s: string) => {
    if (!s) return s
    return s[0].toUpperCase() + s.substring(1)
  }

  const canPush = property.allowPushToTopLevelSkosPrefLabel

  const renderListElem = (val: Value, i: number, nbvalues: number) => {
    //debug("render:", property.qname, property, val, i)
    if (
      val instanceof RDFResourceWithLabel ||
      property.objectType == ObjectType.ResInList ||
      property.objectType == ObjectType.LitInList
    ) {
      if (property.objectType == ObjectType.ResExt)
        return (
          <ExtEntityComponent
            key={val.id + ":" + i}
            subject={subject}
            property={property}
            extRes={val as ExtRDFResourceWithLabel}
            canDel={canDel && (i > 0 || val.uri !== "tmp:uri")}
            onChange={onChange}
            idx={i}
            exists={exists}
            editable={editable}
            {...(owner ? { owner } : {})}
            title={titleCase(propLabel)}
            updateEntityState={updateEntityState}
          />
        )
      else {
        addBtn = false
        // eslint-disable-next-line no-extra-parens
        const canSelectNone = (i == 0 && !property.minCount) || (i > 0 && i == nbvalues - 1)
        return (
          <SelectComponent
            key={"select_" + val.id + "_" + i}
            canSelectNone={canSelectNone}
            subject={subject}
            property={property}
            res={val}
            selectIdx={i}
            canDel={canDel && val != noneSelected}
            editable={editable}
            create={canAdd && <Create subject={subject} property={property} embedded={embedded} newVal={newVal} />}
          />
        )
      }
    } else if (val instanceof Subject) {
      addBtn = true
      return (
        <FacetComponent
          key={val.id}
          subject={subject}
          property={property}
          subNode={val}
          canDel={canDel && editable}
          {...(force ? { force } : {})}
          editable={editable}
          {...(topEntity ? { topEntity } : { topEntity: subject })}
          updateEntityState={updateEntityState}
          shape={shape}
        />
      )
    } else if (val instanceof LiteralWithId) {
      addBtn = false
      const isUnique =
        list.filter((l) => l instanceof LiteralWithId && /*l.value === val.value &&*/ l.language === val.language)
          .length === 1
      return (
        <LiteralComponent
          key={val.id}
          subject={subject}
          property={property}
          lit={val}
          canDel={canDel}
          isUnique={isUnique}
          create={
            <Create
              disable={!canAdd || !(val && val.value !== "")}
              subject={subject}
              property={property}
              embedded={embedded}
              newVal={newVal}
            />
          }
          editable={editable}
          topEntity={topEntity}
          updateEntityState={updateEntityState}
        />
      )
    }
  }

  return (
    <React.Fragment>
      <div
        className={
          "ValueList " +
          (property.maxCount && property.maxCount < list.length ? "maxCount" : "") +
          (hasNonEmptyValue ? "" : "empty") +
          (property.objectType === ObjectType.ResExt ? " ResExt" : "") +
          (embedded ? "" : " main") +
          (canPush ? " canPush" : "")
        }
        data-priority={property.displayPriority ? property.displayPriority : 0}
        role="main"
        style={{
          display: "flex",
          flexWrap: "wrap",
          ...list.length > 1 && firstValueIsEmptyField && property.path.sparqlString !== ns.SKOS("prefLabel").value
            ? {
                /*borderBottom: "2px solid #eee", paddingBottom: "16px"*/
              }
            : {},
        }}
      >
        {showLabel && (!property.in || property.in.length > 1) && (
          <label
            className={"propLabel"}
            data-prop={property.qname}
            data-type={property.objectType}
            data-priority={property.displayPriority}
          >
            {titleCase(propLabel)}
            {helpMessage && property.objectType === ObjectType.ResExt && (
              <Tooltip title={helpMessage}>
                <HelpIcon className="help label" />
              </Tooltip>
            )}
          </label>
        )}
        {hasEmptyExtEntityAsFirst && <div style={{ width: "100%" }}>{renderListElem(list[0], 0, list.length)}</div>}
        <div
          ref={scrollElem}
          className={!embedded && property.objectType !== ObjectType.Facet ? "overFauto" : ""}
          style={{
            width: "100%",
            //...!embedded && property.objectType !== ObjectType.Facet ? { maxHeight: "338px" } : {}, // overflow conflict with iframe...
            ...property?.group?.value !== edit ? { paddingRight: "0.5rem" } : {},
          }}
        >
          {list.map((val, i) => {
            if (!hasEmptyExtEntityAsFirst || i > 0) return renderListElem(val, i, list.length)
          })}
        </div>
      </div>
      {canAdd && addBtn && <Create subject={subject} property={property} embedded={embedded} newVal={newVal} />}
    </React.Fragment>
  )
}

/**
 * Create component
 */
const Create: FC<{
  subject: Subject
  property: PropertyShape
  embedded?: boolean
  disable?: boolean
  newVal?: integer
}> = ({ subject, property, embedded, disable, newVal }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const collec = list.length === 1 && list[0].node?.termType === "Collection" ? list[0].node.elements : undefined
  const listOrCollec = collec ? collec : list
  const [uiLang] = useRecoilState(uiLangState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [edit, setEdit] = useRecoilState(uiEditState)
  const [idToken, setIdToken] = useState(localStorage.getItem("BLMPidToken"))
  const [RIDprefix, setRIDprefix] = useRecoilState(RIDprefixState)

  //debug("create:",newVal,nextItem,property.qname) //,property) //,subject.getAtomForProperty(property.path.sparqlString))

  const [nextItem, setNextItem] = useState()
  useEffect(() => {
    //debug("next?",nextItem,list)
    if (nextItem && listOrCollec.findIndex((l) => l === nextItem) === -1) {
      setList(listOrCollec.concat(nextItem))
      setNextItem(null)
      //debug("done")
    }
  }, [list, nextItem])

  let waitForNoHisto = false
  const addItem = async (event, count = 1) => {
    if (waitForNoHisto) return

    if (property.objectType === ObjectType.Facet) {
      waitForNoHisto = true
      subject.noHisto(false, 1) // allow parent node in history but default empty subnodes before tmp:allValuesLoaded
    }
    let items = []
    let item, ids
    if (count > 1 && property.targetShape?.independentIdentifiers) {
      //debug("count:",count)
      items = await generateDefault(property, subject, RIDprefix, idToken, newVal, count)
      for (const it of items) {
        //debug("it:",it)
        setNextItem(it)
        item = it
        await new Promise((r) => setTimeout(r, 1))
      }
    } else {
      item = await generateDefault(property, subject, RIDprefix, idToken, newVal)
      items.push(item)
      setList(listOrCollec.concat(item)) //(oldList) => [...oldList, item])
    }

    if (property.objectType === ObjectType.Facet && item instanceof Subject) {
      //setEdit(property.qname+item.qname)  // won't work...
      setImmediate(() => {
        // this must be "delayed" to work
        setEdit(subject.qname + " " + property.qname + " " + item.qname)
      })

      setTimeout(() => {
        subject.noHisto(false, false) // history back to normal
        waitForNoHisto = false
      }, 350) // *arbitrary long* delay during which add button can't be used
    }
  }

  //debug("path/type:", property.objectType, property.path.sparqlString, disable)

  if (
    property.objectType !== ObjectType.Facet &&
    (embedded ||
      property.objectType == ObjectType.Literal ||
      property.objectType == ObjectType.ResInList ||
      property.objectType == ObjectType.LitInList)
    /*
      property.path.sparqlString === ns.SKOS("prefLabel").value ||
      property.path.sparqlString === ns.SKOS("altLabel").value ||
      property.path.sparqlString === ns.BDO("catalogInfo").value ||
      property.path.sparqlString === ns.RDFS("comment").value)
    */
  )
    return <MinimalAddButton disable={disable} add={addItem} className=" " />
  else {
    const targetShapeLabels = property.targetShape?.targetClassPrefLabels
    const labels = targetShapeLabels ? targetShapeLabels : property.prefLabels
    const count = property.allowBatchManagement ? 2 : 1
    return <BlockAddButton add={addItem} label={ValueByLangToStrPrefLang(labels, uiLang)} count={count} />
  }
}

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiFormHelperText-root": {
      color: theme.palette.secondary.main,
    },
  },
}))

/**
 * Edit component
 */
const EditLangString: FC<{
  property: PropertyShape
  lit: LiteralWithId
  onChange: (value: LiteralWithId) => void
  label: string
  globalError?: string
  editable?: boolean
  updateEntityState: (es: EditedEntityState) => void
  entity: Subject
  index: number
}> = ({ property, lit, onChange, label, globalError, editable, updateEntityState, entity, index }) => {
  const classes = useStyles()
  const [editMD, setEditMD] = useState(false)
  const [keyboard, setKeyboard] = useState(false)

  const canPushPrefLabel = property.allowPushToTopLevelSkosPrefLabel

  const getLangStringError = (val: string) => {
    let err = ""
    if (!val && property.minCount) err = i18n.t("error.empty")
    else if (globalError) err = globalError
    return err
  }

  const [error, setError] = useState("") //getLangStringError(lit.value))

  useEffect(() => {
    const newError = getLangStringError(lit.value)
    //debug("newE:",newError,error,lit,lit.id)
    if (newError != error) {
      setError(newError)
      updateEntityState(newError ? EditedEntityState.Error : EditedEntityState.Saved, lit.id)
    }
  })

  const errorData = {
    helperText: (
      <React.Fragment>
        <ErrorIcon style={{ fontSize: "20px", verticalAlign: "-7px" }} />
        &nbsp;<i>{error}</i>
      </React.Fragment>
    ),
    error: true,
  }

  const [withPreview, setWithPreview] = useState(false)
  useLayoutEffect(() => {
    setWithPreview(lit.language === "bo-x-ewts" && lit.value && document.activeElement === inputRef.current)
  })

  let padBot = "0px"
  if (withPreview) {
    padBot = "40px"
  } else if (property.singleLine && editMD) {
    padBot = "1px"
  }

  const codeEdit = { ...commands.codeEdit, icon: <EditIcon style={{ width: "12px", height: "12px" }} /> },
    codePreview = { ...commands.codePreview, icon: <VisibilityIcon style={{ width: "12px", height: "12px" }} /> }

  const hasKB = langs.filter((l) => l.value === lit.language)

  const inputRef = useRef<HTMLInputElement>()

  const keepFocus = () => {
    if (inputRef.current && document.activeElement != inputRef.current) inputRef.current.focus()
  }

  const insertChar = (str: string) => {
    if (inputRef.current) {
      const { selectionStart, selectionEnd, value } = inputRef.current
      //debug("input:", selectionStart, selectionEnd, value)
      const newValue =
        value.substring(0, selectionStart ? selectionStart : 0) + str + value.substring(selectionEnd ? selectionEnd : 0)
      onChange(lit.copyWithUpdatedValue(newValue))
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = (selectionStart ? selectionStart : 0) + str.length
          inputRef.current.selectionEnd = inputRef.current.selectionStart
        }
      }, 10)
    }
  }

  let prefLabelAtom = entity?.getAtomForProperty(ns.SKOS("prefLabel").value)
  if (!prefLabelAtom) prefLabelAtom = initListAtom
  const [prefLabels, setPrefLabels] = useRecoilState(prefLabelAtom)

  const [uiLang] = useRecoilState(uiLangState)

  const pushAsPrefLabel = () => {
    //debug("pL:",prefLabels,lit)
    let newPrefLabels = [],
      found = false
    for (const l in prefLabels) {
      if (prefLabels[l].language === lit.language) {
        found = true
        newPrefLabels = replaceItemAtIndex(prefLabels, l, lit)
        break
      }
    }
    if (!found) newPrefLabels = [...prefLabels, lit.copy()]
    if (newPrefLabels.length) setPrefLabels(newPrefLabels)
  }

  return (
    <div
      className={"mb-0" + (withPreview ? " withPreview" : "")}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "flex-end",
        paddingBottom: padBot,
        position: "relative",
      }}
    >
      {canPushPrefLabel && !error && !globalError && (
        <span className="canPushPrefLabel">
          <span onClick={pushAsPrefLabel}>
            <Tooltip key={lit.id} title={<>Use as the main name or title for this language</>}>
              <span className="img"></span>
            </Tooltip>
          </span>
        </span>
      )}
      {(property.singleLine || !editMD) && (
        <div style={{ width: "100%", position: "relative" }}>
          <TextField
            inputRef={inputRef}
            className={lit.language === "bo" ? " lang-bo" : ""}
            label={label}
            style={{ width: "100%" }}
            value={lit.value}
            multiline={!property.singleLine}
            InputLabelProps={{ shrink: true }}
            inputProps={{ spellCheck: "true", lang: lit.language === "en" ? "en_US" : lit.language }}
            onChange={(e) => {
              const newError = getLangStringError(lit.value)
              if (newError && error != newError) setError(newError)
              else updateEntityState(newError ? EditedEntityState.Error : EditedEntityState.Saved, lit.id)
              onChange(lit.copyWithUpdatedValue(e.target.value))
            }}
            {...(error ? errorData : {})}
            {...(!editable ? { disabled: true } : {})}
            onFocus={() => setWithPreview(lit.language === "bo-x-ewts" && lit.value)}
            onBlur={() => {
              setWithPreview(false)
              setTimeout(() => {
                if (inputRef.current && document.activeElement != inputRef.current) setKeyboard(false)
              }, 350)
            }}
          />
          {property.allowMarkDown && (
            <span
              className={"opaHover"}
              style={{ position: "absolute", right: 0, top: 0, fontSize: "0px" }}
              onClick={() => setEditMD(!editMD)}
            >
              {!editMD && <MDIcon style={{ height: "16px" }} />}
              {editMD && <MDIcon style={{ height: "16px" }} />}
            </span>
          )}
          {hasKB.length > 0 && hasKB[0].keyboard && (
            <span
              onClick={() => {
                setKeyboard(!keyboard)
                keepFocus()
              }}
              className={"opaHover " + (keyboard ? "on" : "")}
              style={{
                position: "absolute",
                right: 0,
                top: "0px",
                height: "100%",
                display: "flex",
                alignItems: "center",
              }}
            >
              <KeyboardIcon />
            </span>
          )}
          {hasKB.length > 0 && hasKB[0].keyboard && keyboard && (
            <div className="card px-2 py-2 hasKB" style={{ display: "block", width: "405px" }} onClick={keepFocus}>
              {hasKB[0].keyboard.map((k, i) => (
                <span
                  key={i}
                  className="card mx-1 my-1"
                  style={{
                    display: "inline-flex",
                    width: "40px",
                    height: "40px",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => insertChar(k)}
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {!property.singleLine && editMD && (
        <div style={{ width: "100%", position: "relative", paddingBottom: "1px" }}>
          <MDEditor
            textareaProps={{ spellCheck: "true", lang: lit.language === "en" ? "en_US" : lit.language }}
            value={lit.value}
            preview="edit"
            onChange={(e) => {
              if (e) onChange(lit.copyWithUpdatedValue(e))
            }}
            commands={[
              commands.bold,
              commands.italic,
              commands.strikethrough,
              commands.hr,
              commands.title,
              commands.divider,
              commands.link,
              commands.quote,
              commands.code,
              commands.image,
              commands.divider,
              commands.unorderedListCommand,
              commands.orderedListCommand,
              commands.checkedListCommand,
              commands.divider,
              codeEdit,
              codePreview,
            ]}
            extraCommands={[]}
          />
          <span
            className={"opaHover on"}
            style={{ position: "absolute", right: "5px", top: "7px", fontSize: "0px", cursor: "pointer" }}
            onClick={() => setEditMD(!editMD)}
          >
            <MDIcon style={{ height: "15px" }} title={"Use rich text editor"} />
          </span>
        </div>
      )}
      <LangSelect
        onChange={(value) => {
          onChange(lit.copyWithUpdatedLanguage(value))
        }}
        value={lit.language || ""}
        property={property}
        {...(error ? { error: true } : {})}
        editable={editable}
      />
      {withPreview && ( // TODO see if fromWylie & MD can both be used ('escape' some chars?)
        <div className="preview-ewts">
          <TextField disabled value={fromWylie(lit.value)} />
          {/*editMD && <MDEditor.Markdown source={fromWylie(lit.value)} /> // not really working  */}
        </div>
      )}
    </div>
  )
}

export const humanizeEDTF = (obj, str, locale = "en-US", dbg = false) => {
  if (!obj) return ""

  const conc = (values, sepa) => {
    sepa = sepa ? " " + sepa + " " : ""
    return values.reduce((acc, v, i, array) => {
      if (i > 0) acc += i < array.length - 1 ? ", " : sepa
      acc += humanizeEDTF(v)
      return acc
    }, "")
  }

  // just output EDTF object
  if (dbg /*|| true*/) return JSON.stringify(obj, null, 3)

  if (obj.type === "Set") return conc(obj.values, "or")
  else if (obj.type === "List") return conc(obj.values, "and")
  else if (obj.type === "Interval" && !obj.values[0]) return "not after " + conc([obj.values[1]])
  else if (obj.type === "Interval" && !obj.values[1]) return "not before " + conc([obj.values[0]])
  else if (obj.type === "Interval") return "between " + conc(obj.values, "and")
  else if (obj.approximate) {
    if (obj.type === "Century") return "circa " + (Number(obj.values[0]) + 1) + "th c."
    return "circa " + humanizeEDTF({ ...obj, approximate: false }, str, locale, dbg)
  } else if (obj.uncertain) {
    if (obj.type === "Century") return Number(obj.values[0]) + 1 + "th c. ?"
    return humanizeEDTF({ ...obj, uncertain: false }, str, locale, dbg) + "?"
  } else if (obj.unspecified === 12) return obj.values[0] / 100 + 1 + "th c."
  else if (obj.type === "Century") return Number(obj.values[0]) + 1 + "th c."
  else if (obj.unspecified === 8) return obj.values[0] + "s"
  else if (obj.type === "Decade") return obj.values[0] + "0s"
  else if (!obj.unspecified && obj.values.length === 1) return obj.values[0]
  else if (!obj.unspecified && obj.values.length === 3) {
    try {
      const event = new Date(Date.UTC(obj.values[0], obj.values[1], obj.values[2], 0, 0, 0))
      const options = { year: "numeric", month: "numeric", day: "numeric" }
      const val = event.toLocaleDateString(locale, options)
      //debug("val:",locale,val)
      return val
    } catch (e) {
      debug("locale error:", e, str, obj)
    }
    return str
  } else {
    return str
  }
}

export const LangSelect: FC<{
  onChange: (value: string) => void
  value: string
  property?: PropertyShape
  disabled?: boolean
  error?: boolean
  editable?: boolean
}> = ({ onChange, value, property, disabled, error, editable }) => {
  const onChangeHandler = (event: React.ChangeEvent<{ value: unknown }>) => {
    onChange(event.target.value as string)
  }

  const languages = property?.defaultLanguage ? langsWithDefault(property.defaultLanguage) : langs

  return (
    <div style={{ position: "relative" }}>
      <TextField
        select
        InputLabelProps={{ shrink: true }}
        className={"ml-2"}
        value={value}
        style={{ minWidth: 100, flexShrink: 0, marginTop: "5px" }}
        onChange={onChangeHandler}
        {...(disabled ? { disabled: true } : {})}
        {...(error ? { error: true, helperText: <br /> } : {})}
        {...(!editable ? { disabled: true } : {})}
      >
        {languages.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.value}
          </MenuItem>
        ))}
        {!languages.some((l) => l.value === value) && (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        )}
      </TextField>
    </div>
  )
}

const EditString: FC<{
  property: PropertyShape
  lit: LiteralWithId
  onChange: (value: LiteralWithId) => void
  label: string
  editable?: boolean
  updateEntityState: (es: EditedEntityState) => void
  entity: Subject
  index: number
}> = ({ property, lit, onChange, label, editable, updateEntityState, entity, index }) => {
  const classes = useStyles()
  const [uiLang] = useRecoilState(uiLangState)

  const dt = property.datatype
  const pattern = property.pattern ? new RegExp(property.pattern) : undefined
  const useEdtf = property.specialPattern?.value === ns.BDS("PatternEDTF").value

  const [error, setError] = useState("") //getIntError(lit.value))

  // eslint-disable-next-line prefer-const
  let atoms = {
    "bdo:onYear": entity.getAtomForProperty(ns.BDO("onYear").value),
    "bdo:notBefore": entity.getAtomForProperty(ns.BDO("notBefore").value),
    "bdo:notAfter": entity.getAtomForProperty(ns.BDO("notAfter").value),
  }

  const [readableEDTF, setReadableEDTF] = useState("")
  const [EDTFtoOtherFields, setEDTFtoOtherFields] = useRecoilState(
    EDTFtoOtherFieldsSelector({
      error: !useEdtf,
      atoms: {
        "bdo:onYear": entity.getAtomForProperty(ns.BDO("onYear").value),
        "bdo:notBefore": entity.getAtomForProperty(ns.BDO("notBefore").value),
        "bdo:notAfter": entity.getAtomForProperty(ns.BDO("notAfter").value),
      },
    })
  )

  const getPatternError = (val: string) => {
    let err = ""
    if (pattern !== undefined && val !== "" && !val.match(pattern)) {
      err = ValueByLangToStrPrefLang(property.errorMessage, uiLang)
      debug("err:", property.errorMessage)
    }
    return err
  }

  const locales = { en: "en-US", "zh-hans": "zh-Hans-CN", bo: "bo-CN" }

  let timerEdtf = 0,
    changeCallback = () => false
  useEffect(() => {
    //debug("cCb?",uiLang,locales[uiLang])
    changeCallback = (val: string) => {
      //debug("change!",val)
      if (val === "") {
        setError("")
        setReadableEDTF("")
        updateEntityState(EditedEntityState.Saved, lit.id)
      } else if (useEdtf) {
        if (timerEdtf) clearTimeout(timerEdtf)
        const delay = 350
        timerEdtf = setTimeout(() => {
          try {
            //debug("edtf:val", val, edtf, parse)
            const obj = parse(val)
            //debug("edtf:parse", obj)
            const edtfObj = edtf(val)
            //debug("edtf:obj", edtfObj)
            setError("")
            setReadableEDTF(humanizeEDTF(obj, val, locales[uiLang[0]]))
            setEDTFtoOtherFields({ lit, val, obj })
            updateEntityState(EditedEntityState.Saved, lit.id)
          } catch (e) {
            //debug("EDTF error:", e.message)
            setReadableEDTF("")
            setError(
              <>
                This field must be in EDTF format, see&nbsp;
                <a href="https://www.loc.gov/standards/datetime/" rel="noopener noreferrer" target="_blank">
                  https://www.loc.gov/standards/datetime/
                </a>
                .
                {!["No possible parsing", "Syntax error"].some((err) => e.message?.includes(err)) && (
                  <>
                    <br />[{e.message}
                    {/* <br />
                    {e.toString()}
                    <br />
                    {e.stack} */}
                    ]
                  </>
                )}
              </>
            )
            updateEntityState(EditedEntityState.Error, lit.id)
          }
        }, delay)
      } else {
        const newError = getPatternError(val)
        setError(newError)
        updateEntityState(newError ? EditedEntityState.Error : EditedEntityState.Saved, lit.id)
      }
      onChange(lit.copyWithUpdatedValue(val))
    }
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <TextField
        //className={/*classes.root +*/ " mt-2"}
        label={label}
        style={{ width: "100%" }}
        value={lit.value}
        {...(property.qname !== "bds:NoteShape-contentLocationStatement" ? { InputLabelProps: { shrink: true } } : {})}
        onBlur={(e) => setReadableEDTF("")}
        onFocus={(e) => changeCallback(e.target.value)}
        onChange={(e) => changeCallback(e.target.value)}
        {...(!editable ? { disabled: true } : {})}
        {...(error
          ? {
              helperText: (
                <React.Fragment>
                  <ErrorIcon style={{ fontSize: "20px", verticalAlign: "-7px" }} /> <i>{error}</i>
                </React.Fragment>
              ),
              error: true,
            }
          : {})}
      />
      {readableEDTF && (
        <div className="preview-EDTF" style={{ width: "100%" }}>
          {/* <TextField disabled value={readableEDTF} /> */}
          <pre>{readableEDTF}</pre>
        </div>
      )}
    </div>
  )
}

const EditBool: FC<{
  property: PropertyShape
  lit: LiteralWithId
  onChange: (value: LiteralWithId) => void
  label: string
  editable?: boolean
}> = ({ property, lit, onChange, label, editable }) => {
  const classes = useStyles()

  const dt = property.datatype

  //debug("bool:",lit)

  const changeCallback = (val: string) => {
    onChange(lit.copyWithUpdatedValue(val))
  }
  return (
    <TextField
      select
      style={{ padding: "1px", minWidth: "250px" }}
      label={label}
      value={!lit.value || lit.value == "false" ? false : true}
      InputLabelProps={{ shrink: true }}
      onChange={(e) => changeCallback(e.target.value)}
      {...(!editable ? { disabled: true } : {})}
    >
      {["true", "false"].map((v) => (
        <MenuItem key={v} value={v}>
          {i18n.t("types." + v)}
        </MenuItem>
      ))}
    </TextField>
  )
}

const EditInt: FC<{
  property: PropertyShape
  lit: LiteralWithId
  onChange: (value: LiteralWithId) => void
  label: string
  editable?: boolean
  updateEntityState: (es: EditedEntityState) => void
  hasNoOtherValue: boolean
  index: number
}> = ({ property, lit, onChange, label, editable, updateEntityState, hasNoOtherValue, index }) => {
  // used for integers and gYear

  const classes = useStyles()

  const dt = property.datatype
  const minInclusive = property.minInclusive
  const maxInclusive = property.maxInclusive
  const minExclusive = property.minExclusive
  const maxExclusive = property.maxExclusive

  const getIntError = (val: string) => {
    let err = ""
    if (hasNoOtherValue && val === "") {
      err = i18n.t("error.empty")
    } else if (val !== undefined && val !== "") {
      const valueInt = parseInt(val)
      if (minInclusive && minInclusive > valueInt) {
        err = i18n.t("error.superiorTo", { val: minInclusive })
      } else if (maxInclusive && maxInclusive < valueInt) {
        err = i18n.t("error.inferiorTo", { val: maxInclusive })
      } else if (minExclusive && minExclusive >= valueInt) {
        err = i18n.t("error.superiorToStrict", { val: minExclusive })
      } else if (maxExclusive && maxExclusive <= valueInt) {
        err = i18n.t("error.inferiorToStrict", { val: maxExclusive })
      }
    }
    return err
  }

  const [error, setError] = useState("") //getIntError(lit.value))

  useEffect(() => {
    if (!hasNoOtherValue && (lit.value === undefined || lit.value === null || lit.value === "")) return
    const newError = getIntError(lit.value)
    if (newError != error) {
      setError(newError)
      updateEntityState(newError ? EditedEntityState.Error : EditedEntityState.Saved, lit.id)
    }
  })

  const changeCallback = (val: string) => {
    const newError = getIntError(val)
    if (newError != error) setError(newError)
    else updateEntityState(newError ? EditedEntityState.Error : EditedEntityState.Saved, lit.id)

    //debug("change:", newError)

    if (dt && dt.value == xsdgYear) {
      //pad to four digits in the case of xsdgYear
      /* eslint-disable no-magic-numbers */
      if (val.startsWith("-")) {
        val = "-" + val.substring(1).padStart(4, "0")
      } else {
        val = val.padStart(4, "0")
      }
    }
    onChange(lit.copyWithUpdatedValue(val))
  }

  let value = lit.value
  if (dt && dt.value == xsdgYear) {
    // don't display the leading 0
    //debug("val?", value, lit)
    value = value.replace(/^(-?)0+/, "$1")
  }

  return (
    <TextField
      label={label}
      style={{ width: 240 }}
      value={value}
      {...(error
        ? {
            helperText: (
              <React.Fragment>
                {/*eventType // "Number"*/} <ErrorIcon style={{ fontSize: "20px", verticalAlign: "-7px" }} />
                <i> {error}</i>
              </React.Fragment>
            ),
            error: true,
          }
        : {})}
      type="number"
      InputProps={{ inputProps: { min: minInclusive, max: maxInclusive } }}
      InputLabelProps={{ shrink: true }}
      onChange={(e) => changeCallback(e.target.value)}
      {...(!editable ? { disabled: true } : {})}
    />
  )
}

const xsdgYear = ns.XSD("gYear").value
const rdflangString = ns.RDF("langString").value
const xsdinteger = ns.XSD("integer").value
const xsddecimal = ns.XSD("decimal").value
const xsdint = ns.XSD("int").value
const xsdboolean = ns.XSD("boolean").value

const intishTypeList = [xsdinteger, xsddecimal, xsdint]

/**
 * Display component, with DeleteButton
 */
const LiteralComponent: FC<{
  lit: LiteralWithId
  subject: Subject
  property: PropertyShape
  canDel: boolean
  isUnique: boolean
  create?: Create
  editable: boolean
  topEntity?: Subject
  updateEntityState: (es: EditedEntityState) => void
}> = ({ lit, subject, property, canDel, isUnique, create, editable, topEntity, updateEntityState }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const index = list.findIndex((listItem) => listItem === lit)
  const [entities, setEntities] = useRecoilState(entitiesAtom)
  const [undos, setUndos] = useRecoilState(uiUndosState)
  const [uiLang] = useRecoilState(uiLangState)

  const propLabel = ValueByLangToStrPrefLang(property.prefLabels, uiLang)
  const helpMessage = ValueByLangToStrPrefLang(property.helpMessage, uiLang)

  const onChange: (value: LiteralWithId) => void = (value: LiteralWithId) => {
    const newList = replaceItemAtIndex(list, index, value)
    setList(newList)
  }

  const deleteItem = () => {
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  useEffect(() => {
    let error = false
    const entityQname = topEntity ? topEntity.qname : subject.qname
    const n = entities.findIndex((e) => e.subjectQname === entityQname)
    if (n > -1) {
      const ent = entities[n]
      if (ent.state === EditedEntityState.Error) error = true
    }
    if (!error) updateEntityState(EditedEntityState.Saved, lit.id)
  }, [undos])

  const t = property.datatype
  let edit, classN

  if (t?.value === rdflangString) {
    classN = "langString " + (lit.value ? "lang-" + lit.language : "")
    edit = (
      <EditLangString
        property={property}
        lit={lit}
        onChange={onChange}
        label={[
          propLabel,
          helpMessage ? (
            <Tooltip key={lit.id} title={helpMessage}>
              <HelpIcon className="help literal" />
            </Tooltip>
          ) : null,
        ]}
        {...(property.uniqueLang && !isUnique ? { globalError: i18n.t("error.unique") } : {})}
        editable={editable && !property.readOnly}
        updateEntityState={updateEntityState}
        entity={topEntity ? topEntity : subject}
        index={index}
      />
    )
    // eslint-disable-next-line no-extra-parens
  } else if (t?.value === xsdgYear || (t && t?.value && intishTypeList.includes(t.value))) {
    classN = "gYear intish"
    edit = (
      <EditInt
        property={property}
        lit={lit}
        onChange={onChange}
        label={[
          propLabel,
          helpMessage ? (
            <Tooltip key={lit.id} title={helpMessage}>
              <HelpIcon className="help literal" />
            </Tooltip>
          ) : null,
        ]}
        editable={editable && !property.readOnly}
        updateEntityState={updateEntityState}
        hasNoOtherValue={property.minCount === 1 && list.length === 1}
        index={index}
      />
    )
  } else if (t?.value === xsdboolean) {
    edit = (
      <EditBool
        property={property}
        lit={lit}
        onChange={onChange}
        label={[
          propLabel,
          helpMessage ? (
            <Tooltip key={lit.id} title={helpMessage}>
              <HelpIcon className="help literal" />
            </Tooltip>
          ) : null,
        ]}
        editable={editable && !property.readOnly}
      />
    )
  } else {
    edit = (
      <EditString
        property={property}
        lit={lit}
        onChange={onChange}
        label={[
          propLabel,
          helpMessage ? (
            <Tooltip key={lit.id} title={helpMessage}>
              <HelpIcon className="help literal" />
            </Tooltip>
          ) : null,
        ]}
        editable={editable && !property.readOnly}
        updateEntityState={updateEntityState}
        entity={subject}
        index={index}
      />
    )
  }

  return (
    <div className={classN} style={{ display: "flex", alignItems: "flex-end" /*, width: "100%"*/ }}>
      {edit}
      <div className="hoverPart">
        <button
          className="btn btn-link ml-2 px-0 py-0 close-facet-btn"
          onClick={deleteItem}
          {...(!canDel ? { disabled: true } : {})}
        >
          <RemoveIcon className="my-0 close-facet-btn" />
        </button>
        {create}
      </div>
    </div>
  )
}

//TODO: should probably go to another file
const FacetComponent: FC<{
  subNode: Subject
  subject: Subject
  property: PropertyShape
  canDel: boolean
  //force?: boolean
  editable: boolean
  topEntity: Subject
  updateEntityState: (es: EditedEntityState) => void
  shape: Shape
}> = ({ subNode, subject, property, canDel, /*force,*/ editable, topEntity, updateEntityState, shape }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const [uiLang] = useRecoilState(uiLangState)
  const index = list.findIndex((listItem) => listItem === subNode)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const deleteItem = () => {
    updateEntityState(EditedEntityState.Saved, subNode.qname, true)
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  const targetShape = property.targetShape
  if (!targetShape) throw "unable to find target shape of " + property.lname

  const withDisplayPriority: PropertyShape[] = [],
    withoutDisplayPriority: PropertyShape[] = []
  targetShape.properties.map((subprop) => {
    if (subprop.displayPriority && subprop.displayPriority >= 1) {
      withDisplayPriority.push(subprop)
    } else {
      withoutDisplayPriority.push(subprop)
    }
  })

  const [force, setForce] = useState(false)
  const hasExtra = withDisplayPriority.length > 0 // && isSimplePriority
  let waitForNoHisto = false
  const toggleExtra = () => {
    if (waitForNoHisto) return

    waitForNoHisto = true
    subject.noHisto(false, -1) // put empty subnodes in history before tmp:allValuesLoaded

    setForce(!force)

    const delay = 350
    setTimeout(() => {
      subject.noHisto(false, false) // history back to normal
      subject.resetNoHisto()
      waitForNoHisto = false
    }, delay) // *arbitrary long* delay during which button can't be used
  }

  const [edit, setEdit] = useRecoilState(uiEditState)

  //debug("facet:", edit, topEntity.qname, subject.qname + " " + property.qname + " " + subNode.qname)

  let editClass = ""
  if (
    edit === subject.qname + " " + property.qname + " " + subNode.qname ||
    edit.startsWith(subNode.qname + " ") ||
    edit.endsWith(" " + subject.qname)
  ) {
    editClass = "edit"
  }

  return (
    <React.Fragment>
      <div
        className={"facet " + editClass + " editable-" + editable + " force-" + force}
        onClick={(ev) => {
          setEdit(subject.qname + " " + property.qname + " " + subNode.qname)
          const target = ev.target as Element
          if (editClass || target?.classList && !target?.classList?.contains("close-facet-btn")) {
            ev.stopPropagation()
          }
        }}
      >
        <div className={"card pt-2 pb-3 pr-3 mt-4 pl-2 " + (hasExtra ? "hasDisplayPriority" : "")}>
          {targetShape.independentIdentifiers && <div className="internalId">{subNode.lname}</div>}
          {withoutDisplayPriority.map((p, index) => (
            <PropertyContainer
              key={index + p.uri}
              property={p}
              subject={subNode}
              embedded={true}
              force={force}
              editable={!p.readOnly}
              owner={subject}
              topEntity={topEntity}
              shape={shape}
            />
          ))}
          {withDisplayPriority.map((p, index) => (
            <PropertyContainer
              key={index + p.uri}
              property={p}
              subject={subNode}
              embedded={true}
              force={force}
              editable={!p.readOnly}
              owner={subject}
              topEntity={topEntity}
              shape={shape}
            />
          ))}
          {hasExtra && (
            <span className="toggle-btn btn btn-rouge mt-4" onClick={toggleExtra}>
              {i18n.t("general.toggle", { show: force ? i18n.t("general.hide") : i18n.t("general.show") })}
            </span>
          )}
          <div className="close-btn">
            {targetShape.description && (
              <Tooltip title={ValueByLangToStrPrefLang(targetShape.description, uiLang)}>
                <HelpIcon className="help" />
              </Tooltip>
            )}
            <button
              className="btn btn-link ml-2 px-0 close-facet-btn py-0"
              onClick={deleteItem}
              {...(!canDel ? { disabled: true } : {})}
            >
              <CloseIcon className="close-facet-btn my-1" />
            </button>
          </div>
        </div>
      </div>
    </React.Fragment>
  )
}

//TODO: component to display an external entity that has already been selected, with a delete button to remove it
// There should probably be a ExtEntityCreate or something like that to allow an entity to be selected
const ExtEntityComponent: FC<{
  extRes: ExtRDFResourceWithLabel
  subject: Subject
  property: PropertyShape
  canDel: boolean
  onChange: (value: ExtRDFResourceWithLabel, idx: number, removeFirst: boolean | undefined) => void
  idx: number
  exists: (uri: string) => boolean
  editable: boolean
  owner?: Subject
  title: string
  updateEntityState: (es: EditedEntityState) => void
}> = ({ extRes, subject, property, canDel, onChange, idx, exists, editable, owner, title, updateEntityState }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const index = list.findIndex((listItem) => listItem === extRes)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const deleteItem = () => {
    let newList = removeItemAtIndex(list, index)
    // remove first empty field if alone & displayPriority >= 1
    if (idx === 1 && newList.length === 1) {
      const first = newList[0]
      if (first instanceof ExtRDFResourceWithLabel && first.uri === "tmp:uri") newList = []
    }
    setList(newList)
  }

  const [error, setError] = useState("")

  useEffect(() => {
    let newError
    const nonEmptyList = list.filter((e) => e.uri !== "tmp:uri")
    if (property.minCount && nonEmptyList.length < property.minCount) {
      newError = i18n.t("error.minC", { count: property.minCount })
    } else if (property.maxCount && nonEmptyList.length > property.maxCount) {
      newError = i18n.t("error.maxC", { count: property.maxCount })
    } else newError = ""

    //debug("nE?e",property.qname,newError,error)
    //debug("minC?",newError,nonEmptyList.length,property.minCount,property.maxCount)

    setError(newError)
    updateEntityState(newError ? EditedEntityState.Error : EditedEntityState.Saved, property.qname)
  }, [list])

  //, ...extRes.uri === "tmp:uri" ? { /*width: "100%"*/ } : {} }}>
  return (
    <div className={"extEntity" + (extRes.uri === "tmp:uri" ? " new" : "")} style={{ position: "relative" }}>
      <div
        style={{
          ...extRes.uri !== "tmp:uri"
            ? {
                display: "inline-flex",
                width: "auto",
                backgroundColor: "#f0f0f0",
                borderRadius: "4px",
                border: "1px solid #ccc",
                flexDirection: "row",
                position: "static",
              }
            : {
                display: "flex",
              },
        }}
        {...(extRes.uri !== "tmp:uri" ? { className: "px-2 py-1 mr-2 mt-2 card" } : {})}
      >
        <ResourceSelector
          value={extRes}
          onChange={onChange}
          property={property}
          idx={idx}
          exists={exists}
          subject={subject}
          editable={editable}
          {...(owner ? { owner } : {})}
          title={title}
          globalError={error}
          updateEntityState={updateEntityState}
        />
        {extRes.uri !== "tmp:uri" && (
          <button className={"btn btn-link ml-2 px-0"} onClick={deleteItem} {...(!canDel ? { disabled: true } : {})}>
            {extRes.uri === "tmp:uri" ? <RemoveIcon /> : <CloseIcon />}
          </button>
        )}
      </div>
    </div>
  )
}

//TODO: component to display an external entity that has already been selected, with a delete button to remove it
// There should probably be a ExtEntityCreate or something like that to allow an entity to be selected
const SelectComponent: FC<{
  res: LiteralWithId | RDFResourceWithLabel
  subject: Subject
  property: PropertyShape
  canDel: boolean
  canSelectNone: boolean
  selectIdx: number
  editable: boolean
  create?: Element
}> = ({ res, subject, property, canDel, canSelectNone, selectIdx, editable, create }) => {
  if (property.path == null) throw "can't find path of " + property.qname
  const [list, setList] = useRecoilState(subject.getAtomForProperty(property.path.sparqlString))
  const [uiLang, setUiLang] = useRecoilState(uiLangState)
  const [uiLitLang, setUiLitLang] = useRecoilState(uiLitLangState)

  const propLabel = ValueByLangToStrPrefLang(property.prefLabels, uiLang)
  const helpMessage = ValueByLangToStrPrefLang(property.helpMessage, uiLitLang)

  let possibleValues = property.in
  if (possibleValues == null) throw "can't find possible list for " + property.uri

  if (canSelectNone) possibleValues = [noneSelected, ...possibleValues]

  const index = selectIdx

  const deleteItem = () => {
    const newList = removeItemAtIndex(list, index)
    setList(newList)
  }

  const getElementFromValue = (value: string, checkActualValue = false) => {
    for (const v of possibleValues) {
      if (v.id === value || checkActualValue && v.value === value) {
        return v
      }
    }
    debug("error cannot get element from value " + value)
    return null
  }

  const val = res instanceof RDFResourceWithLabel ? res : getElementFromValue(list[index].value, true)

  //debug("selec:", property.qname, index, list, collec, listOrCollec, val, val?.id, res, res?.id, property)

  const onChange: (event: ChangeEvent<{ name?: string | undefined; value: unknown }>) => void = (event) => {
    const resForNewValue = getElementFromValue(event.target.value as string)
    if (resForNewValue == null) {
      throw "getting value from SelectComponent that's not in the list of possible values " + event.target.value
    }
    let newList
    if (resForNewValue == noneSelected && canDel) {
      newList = removeItemAtIndex(list, index)
    } else {
      newList = replaceItemAtIndex(list, index, resForNewValue)
    }
    setList(newList)
  }

  const classes = useStyles()

  // does this work? to me using a "setXyz" in a condition must fail (should work encapsulated in a useEffect though)
  if (possibleValues.length == 1 && list.length == 0) {
    setList([possibleValues[0]])
  }

  return (
    possibleValues.length > 1 && (
      <div className="resSelect" style={{ display: "inline-flex", alignItems: "flex-end" }}>
        <TextField
          select
          className={"selector mr-2"}
          value={val?.id}
          key={"textfield_" + selectIdx + "_" + index}
          style={{ padding: "1px", minWidth: "250px" }}
          onChange={onChange}
          label={[
            propLabel,
            helpMessage ? (
              <Tooltip key={"tooltip_" + selectIdx + "_" + index} title={helpMessage}>
                <HelpIcon className="help" />
              </Tooltip>
            ) : null,
          ]}
          {...(!editable ? { disabled: true } : {})}
        >
          {possibleValues.map((v, k) => {
            if (v instanceof RDFResourceWithLabel) {
              const r = v as RDFResourceWithLabel
              const label = ValueByLangToStrPrefLang(r.prefLabels, uiLitLang)
              return (
                <MenuItem key={"menu-uri_" + selectIdx + r.id} value={r.id} className="withDescription">
                  {r.description ? (
                    <Tooltip title={ValueByLangToStrPrefLang(r.description, uiLitLang)}>
                      <span>{label}</span>
                    </Tooltip>
                  ) : label ? 
                    label
                   : 
                    r.lname
                  }
                </MenuItem>
              )
            } else {
              const l = v as LiteralWithId
              return (
                <MenuItem
                  key={"menu-lit_" + selectIdx + l.id + "_" + index + "_" + k}
                  value={l.id}
                  className="withDescription"
                >
                  {l.value}
                </MenuItem>
              )
            }
          })}
        </TextField>
        <div className="hoverPart">
          {canDel && (
            <button className="btn btn-link mx-0 px-0 py-0" onClick={deleteItem}>
              <RemoveIcon />
            </button>
          )}
          {create}
        </div>
      </div>
    )
  )
}

export default ValueList
