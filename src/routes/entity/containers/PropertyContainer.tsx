import React, { useState, FC } from "react"
import { PropertyShape, RDFResource, Subject, LiteralWithId } from "../../../helpers/rdf/types"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState, atomFamily } from "recoil"
import LitList from "./litlist"
import * as rdf from "rdflib"

const debug = require("debug")("bdrc:entity:property")

const PropertyContainer: FC<{ property: PropertyShape; subject: Subject }> = ({ property, subject }) => {
  const [uiLang] = useRecoilState(uiLangState)
  const propLabel = lang.ValueByLangToStrPrefLang(property.prefLabels, uiLang)

  const addIdToLitList = (litList: Array<rdf.Literal>): Array<LiteralWithId> => {
    return litList.map(
      (lit: rdf.Literal): LiteralWithId => {
        return new LiteralWithId(lit.value, lit.language, lit.datatype)
      }
    )
  }

  return (
    <React.Fragment>
      <div role="main">
        <section className="album px-3">
          <div className="container" style={{ border: "dashed 1px none" }}>
            <div className="row card my-4 px-3 py-2">
              <p className="col-4 text-uppercase small my-2 pl-0">{propLabel}</p>
              <LitList subject={subject} property={property} />
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  )
}

export default PropertyContainer
