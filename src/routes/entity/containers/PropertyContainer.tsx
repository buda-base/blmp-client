import React, { useState, FC } from "react"
import { RDFResource, Subject, LiteralWithId, ObjectType } from "../../../helpers/rdf/types"
import { PropertyShape } from "../../../helpers/rdf/shapes"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState, atomFamily } from "recoil"
import ValueList from "./ValueList"
import * as rdf from "rdflib"

const debug = require("debug")("bdrc:entity:property")

const PropertyContainer: FC<{
  property: PropertyShape
  subject: Subject
  embedded?: boolean
  force?: boolean
  edit?: boolean
}> = ({ property, subject, embedded, force, edit }) => {
  const objectType = property.objectType

  return (
    <React.Fragment>
      <div role="main">
        <section className="album">
          <div className={"container" + (embedded ? " px-0" : "")} style={{ border: "dashed 1px none" }}>
            <ValueList subject={subject} property={property} embedded={embedded} force={force} edit={edit} />
          </div>
        </section>
      </div>
    </React.Fragment>
  )
}

export default PropertyContainer
