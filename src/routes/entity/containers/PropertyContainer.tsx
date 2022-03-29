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
  editable: boolean
  owner?: Subject
  topEntity?: Subject
  shape: Shape
}> = ({ property, subject, embedded, force, editable, owner, topEntity, shape }) => {
  const objectType = property.objectType

  //debug("propertyCtn:", property.qname, property, subject.qname, subject)

  return (
    <React.Fragment>
      <div role="main">
        <section className="album">
          <div
            className={"container" + (embedded ? " px-0" : "") + " editable-" + editable}
            style={{ border: "dashed 1px none" }}
          >
            <ValueList
              subject={subject}
              property={property}
              embedded={embedded}
              force={force}
              editable={editable}
              {...(owner ? { owner } : {})}
              {...(topEntity ? { topEntity } : {})}
              shape={shape}
            />
          </div>
        </section>
      </div>
    </React.Fragment>
  )
}

export default PropertyContainer
