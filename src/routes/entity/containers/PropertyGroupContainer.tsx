import React, { useState, FC, ReactElement } from "react"
import PropertyContainer from "./PropertyContainer"
import { RDFResource, Subject } from "../../../helpers/rdf/types"
import { PropertyGroup } from "../../../helpers/rdf/shapes"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"
import { OtherButton } from "./ValueList"
import i18n from "i18next"

const debug = require("debug")("bdrc:entity:propertygroup")

const PropertyGroupContainer: FC<{ group: PropertyGroup; subject: Subject }> = ({ group, subject }) => {
  const [uiLang] = useRecoilState(uiLangState)
  const label = lang.ValueByLangToStrPrefLang(group.prefLabels, uiLang)
  const [force, setForce] = useState(false)

  const hasExtra =
    group.properties.filter((property) => property.displayPriority && property.displayPriority >= 1).length > 0
  const toggleExtra = () => {
    setForce(!force)
  }

  return (
    <React.Fragment>
      <div role="main">
        <section className="album">
          <div className="container col-lg-6 col-md-6 col-sm-12" style={{ border: "dashed 1px none" }}>
            <div className="row card my-4 pb-3">
              <p className="col-4 text-uppercase small my-2">{label}</p>
              <div>
                {hasExtra && (
                  <span className="toggle-btn" onClick={toggleExtra}>
                    {i18n.t("general.toggle", { show: force ? i18n.t("general.hide") : i18n.t("general.show") })}
                  </span>
                )}
                {group.properties
                  .filter((property) => !property.displayPriority)
                  .map((property, index) => (
                    <PropertyContainer key={index} property={property} subject={subject} />
                  ))}
                {group.properties
                  .filter((property) => property.displayPriority && property.displayPriority >= 1)
                  .map((property, index) => (
                    <PropertyContainer key={index} property={property} subject={subject} force={force} />
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
