import React, { useState, useEffect, useMemo } from "react"

const debug = require("debug")("bdrc:entity:property")

function PropertyContainer(props) {
  const [property] = useState(props.property)

  return (
    <React.Fragment>
      <div role="main">
        <section className="album">
          <div className="container col-lg-6 col-md-6 col-sm-12" style={{ border: "dashed 1px none" }}>
            <div className="row card my-4">
              <p className="col-4 text-uppercase small my-2">{property.qname}</p>
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  )
}

export default PropertyContainer
