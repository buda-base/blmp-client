import React, { useState, useEffect, useMemo, FC } from "react"
import { TimeTravelObserver } from "../../helpers/observer"
import { ShapeFetcher, debugStore } from "../../../helpers/rdf/io"
import { RDFResource, Subject } from "../../../helpers/rdf/types"
import { PropertyShape, NodeShape } from "../../../helpers/rdf/shapes"
import { generateNew } from "../../../helpers/rdf/construct"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"
import PropertyContainer from "./PropertyContainer"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"
import { AppProps, IdTypeParams } from "../../../containers/AppContainer"
import Button from "@material-ui/core/Button"
import * as rdf from "rdflib"

const debug = require("debug")("bdrc:entity:edit")

const SubNodeEditContainer: FC<{ shape: NodeShape; subject: Subject }> = ({ shape, subject }) => {
  return (
    <React.Fragment>
      <span>for debug: {subject.lname}</span>
      <div>
        {shape.properties.map((p, index) => (
          <PropertyContainer key={p.uri} property={p} subject={subject} />
        ))}
      </div>
    </React.Fragment>
  )
}

export default SubNodeEditContainer
