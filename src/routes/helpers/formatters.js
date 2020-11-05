import React from "react"
import is from "is_js"
import { fromWylie } from "jsewts"
import { idGenerator } from "../../helpers/id"

const keyify = idGenerator

export const labelsForPerson = [
  "rdfs:label",
  "noteText",
  "skos:prefLabel",
  "contentLocationStatement",
  "noteSource",
  "skos:altLabel",
  "rdfs:comment",
  "eventWhere",
  "personEventRole",
  "onOrAbout",
  "notBefore",
  "notAfter",
  "onDate",
  "onYear"
]

export const labelsForWork = [
  "rdfs:label",
  "noteText",
  "skos:prefLabel",
  "contentLocationStatement",
  "noteSource",
  "skos:altLabel",
  "rdfs:comment",
]

export const extractDisplayName = (prefLabelBlock) =>
  prefLabelBlock && prefLabelBlock.length ? prefLabelBlock[0]["@value"] : ""

export const extractTextLiteral = (wrapper, parent = "", options = {}) => {
  const { convertWylie } = options
  if (is.falsy(wrapper)) return null

  if (is.string(wrapper))
    return (
      <React.Fragment key={keyify(parent)}>
        <p style={{ margin: 0 }}>
          {wrapper} <span className={`annot annot-${parent}`}>{` ${parent}`}</span>
        </p>
      </React.Fragment>
    )

  if (is.array(wrapper)) {
    return wrapper.map((e, index) => extractTextLiteral(e, parent + index, options))
  }
  if (is.object(wrapper)) {

    if (wrapper["@language"]) {
      return (
        <React.Fragment key={keyify(parent)}>
          <p style={{ margin: 0 }}>
            <span>{wrapper["@value"]}</span>
            <span className="annot"> {` @${wrapper["@language"]}`}</span>
          </p>
          {convertWylie && wrapper["@language"] === "bo-x-ewts" ?
            <p style={{ margin: 0 }}>
              <strong style={{ fontSize: "1.2em" }}>{fromWylie(wrapper["@value"])}</strong>
              <span className="annot annot-secondary">{" @bo"}</span>
            </p>
          : null }
        </React.Fragment>)
    } else {
      return extractTextLiteral(wrapper["@value"], parent, options)
    }

  } else {
    return (
      <React.Fragment key={keyify(parent)}>
        <p style={{ margin: 0 }}>
          <span>{wrapper["@value"]}</span>
          {wrapper["@language"] ? <span className="annot"> {` @${wrapper["@language"]}`}</span> : null}
        </p>
      </React.Fragment>
    )
  }
}
