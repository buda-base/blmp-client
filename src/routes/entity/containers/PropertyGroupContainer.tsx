import React, { useState, FC, ReactElement } from "react"
import PropertyContainer from "./PropertyContainer"
import { RDFResource, Subject } from "../../../helpers/rdf/types"
import { PropertyGroup } from "../../../helpers/rdf/shapes"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"

const debug = require("debug")("bdrc:entity:propertygroup")

const PropertyGroupContainer: FC<{ group: PropertyGroup; subject: Subject }> = ({ group, subject }) => {
  const [uiLang] = useRecoilState(uiLangState)
  const label = lang.ValueByLangToStrPrefLang(group.prefLabels, uiLang)

  return (
    <React.Fragment>
      <div role="main">
        <section className="album">
          <div className="container col-lg-6 col-md-6 col-sm-12" style={{ border: "dashed 1px none" }}>
            <div className="row card my-4">
              <p className="col-4 text-uppercase small my-2">{label}</p>
              <div>
                {group.properties.map((property, index) => (
                  <PropertyContainer key={index} property={property} subject={subject} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  )
}

export default PropertyGroupContainer
