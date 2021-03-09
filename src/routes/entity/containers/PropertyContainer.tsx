import React, { useState, FC } from "react"
import { PropertyShape, RDFResource, Subject, LiteralWithId, ObjectType } from "../../../helpers/rdf/types"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState, atomFamily } from "recoil"
import ValueList from "./litlist"
import * as rdf from "rdflib"

const debug = require("debug")("bdrc:entity:property")

const PropertyContainer: FC<{ property: PropertyShape; subject: Subject; embedded?: boolean }> = ({
  property,
  subject,
  embedded,
}) => {
  const objectType = property.objectType

  return (
    <React.Fragment>
      <div role="main">
        <section className="album">
          <div className={"container" + (embedded ? " px-0" : "")} style={{ border: "dashed 1px none" }}>
            <ValueList subject={subject} property={property} embedded={embedded} />
          </div>
        </section>
      </div>
    </React.Fragment>
  )
}

export default PropertyContainer
