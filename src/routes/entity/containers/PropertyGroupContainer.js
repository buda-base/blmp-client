import React, { useState, useEffect, useMemo } from "react"
import PropertyContainer from "./PropertyContainer"

const debug = require("debug")("bdrc:entity:propertygroup")

function PropertyGroupContainer(props) {
  const [group] = useState(props.group)

  return (
    <React.Fragment>
      <div role="main">
        <section className="album">
          <div className="container col-lg-6 col-md-6 col-sm-12" style={{ border: "dashed 1px none" }}>
            <div className="row card my-4">
              <p className="col-4 text-uppercase small my-2">{group.qname}</p>
              <div>
                {group.properties.map((property, index) => (
                  <PropertyContainer key={index} property={property} />
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
