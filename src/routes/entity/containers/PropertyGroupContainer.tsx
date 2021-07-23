import React, { useState, FC, ReactElement } from "react"
import PropertyContainer from "./PropertyContainer"
import { RDFResource, Subject } from "../../../helpers/rdf/types"
import { PropertyGroup, PropertyShape } from "../../../helpers/rdf/shapes"
import { uiLangState, uiEditState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"
import { OtherButton } from "./ValueList"
import i18n from "i18next"

const debug = require("debug")("bdrc:entity:propertygroup")

const PropertyGroupContainer: FC<{ group: PropertyGroup; subject: Subject }> = ({ group, subject }) => {
  const [uiLang] = useRecoilState(uiLangState)
  const label = lang.ValueByLangToStrPrefLang(group.prefLabels, uiLang)
  const [force, setForce] = useState(false)

  const withDisplayPriority: PropertyShape[] = [],
    withoutDisplayPriority: PropertyShape[] = []
  //let isSimplePriority = false
  group.properties.map((property) => {
    if (
      property.displayPriority &&
      property.displayPriority >= 1
      /* // no need 
      ||
      property.targetShape &&
        property.targetShape.properties &&
        property.targetShape.properties.filter((subprop) => subprop.displayPriority && subprop.displayPriority >= 1)
          .length > 0 */
    ) {
      withDisplayPriority.push(property)
      //if(property.displayPriority && property.displayPriority >= 1) isSimplePriority = true
    } else {
      withoutDisplayPriority.push(property)
    }
  })
  const hasExtra = withDisplayPriority.length > 0 // && isSimplePriority
  const toggleExtra = () => {
    setForce(!force)
  }

  const [edit, setEdit] = useRecoilState(uiEditState)

  return (
    <React.Fragment>
      <div role="main" className="group" id={group.qname} style={{ scrollMargin: "90px" }}>
        <section className="album">
          <div className="container col-lg-6 col-md-6 col-sm-12" style={{ border: "dashed 1px none" }}>
            <div
              className={"row card my-4 pb-3" + (edit === group.qname ? " group-edit" : "")}
              onClick={() => setEdit(group.qname)}
            >
              <p className="">{label}</p>
              <div>
                {hasExtra && (
                  <span className="toggle-btn" onClick={toggleExtra}>
                    {i18n.t("general.toggle", { show: force ? i18n.t("general.hide") : i18n.t("general.show") })}
                  </span>
                )}
                {withoutDisplayPriority.map((property, index) => (
                  <PropertyContainer
                    key={index}
                    property={property}
                    subject={subject}
                    editable={property.readOnly !== true}
                  />
                ))}
                {withDisplayPriority.map((property, index) => (
                  <PropertyContainer
                    key={index}
                    property={property}
                    subject={subject}
                    force={force}
                    editable={property.readOnly !== true}
                  />
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
