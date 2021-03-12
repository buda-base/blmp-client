import React, { useState, useEffect, useMemo } from "react"
import { TimeTravelObserver } from "../../helpers/observer"
import { ShapeFetcher, debugStore, EntityFetcher } from "../../../helpers/rdf/io"
import * as shapes from "../../../helpers/rdf/shapes"
import { setDefaultPrefixes } from "../../../helpers/rdf/ns"
import { RDFResource, Subject, RDFResourceWithLabel, ExtRDFResourceWithLabel } from "../../../helpers/rdf/types"
import { generateNew } from "../../../helpers/rdf/construct"
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import i18n from "i18next"
import { entitiesAtom } from "../../../containers/EntitySelectorContainer"
import PropertyGroupContainer from "./PropertyGroupContainer"
import { uiLangState } from "../../../atoms/common"
import * as lang from "../../../helpers/lang"
import { atom, useRecoilState } from "recoil"
import { AppProps, IdTypeParams } from "../../../containers/AppContainer"
import Button from "@material-ui/core/Button"
import * as rdf from "rdflib"
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom"

const debug = require("debug")("bdrc:entity:edit")

function NewEntityContainer(props: AppProps) {
  const [uiLang] = useRecoilState(uiLangState)
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  return (
    <React.Fragment>
      <div>
        {shapes.possibleShapeRefs.map((shape: RDFResourceWithLabel, index: number) => (
          <Link key={shape.qname} to={"/edit/" + shape.qname}>
            {lang.ValueByLangToStrPrefLang(shape.prefLabels, uiLang)}
          </Link>
        ))}
      </div>
    </React.Fragment>
  )
}

export default NewEntityContainer
