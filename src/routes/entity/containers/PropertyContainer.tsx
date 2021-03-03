import React, { useState, FC } from "react"
import { Property, RDFResource } from "../../../helpers/rdf/types"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState, atomFamily } from "recoil"
import LitList from "./litlist"
import { generateNew } from "../../../helpers/rdf/construct"

const debug = require("debug")("bdrc:entity:property")

//const defaultResource = new RDFResource()

const family = atomFamily({
  key: "propvalues",
  default: [], // must be iterable for a List component
})

const PropertyContainer: FC<{ property: Property }> = ({ property }) => {
  const [uiLang] = useRecoilState(uiLangState)
  const [list, setList] = useRecoilState(family("test"))
  const propLabel = lang.ValueByLangToStrPrefLang(property.prefLabels, uiLang)

  const subject: RDFResource = generateNew("P")

  return (
    <React.Fragment>
      <div role="main">
        <section className="album">
          <div className="container col-lg-6 col-md-6 col-sm-12" style={{ border: "dashed 1px none" }}>
            <div className="row card my-4">
              <p className="col-4 text-uppercase small my-2">{propLabel}</p>
              <LitList id="prefLabel" initialState={undefined} />
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  )
}

export default PropertyContainer
