import React, { useEffect, useRef, useState } from "react"
import { Redirect } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { useHistory } from "react-router-dom"
import { connect } from "react-redux"
import { DndProvider } from "react-dnd"
import Backend from "react-dnd-html5-backend"
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles"
import CircularProgress from "@material-ui/core/CircularProgress"
import InfiniteScroll from "react-infinite-scroller"
import { lensPath, view, map, addIndex } from "ramda"
import axios from "axios"
import { useRecoilState } from "recoil"

//import { default as BVMT } from "../libs/bvmt/src/App"
import InstanceSearch from "../components/InstanceSearch"
import UpdateManifestError from "../libs/bvmt/src/components/UpdateManifestError"
import { setManifest } from "../libs/bvmt/src/redux/actions/manifest"
import { getOrInitManifest } from "../libs/bvmt/src/api/getManifest"
import Card from "../libs/bvmt/src/components/Card"
import OutlineInfo from "../components/OutlineInfo"
import { outlinesAtom } from "../atoms/common"

import config from "../config"
const debug = require("debug")("bdrc:outline")

const mapIndex = addIndex(map)
const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#212121",
    },
  },
})

const imageListLens = lensPath(["view", "view1", "imagelist"])

// there's nothing to extend because it's a functional component...
// so let's copy/paste what we need instead
function OutlineApp(props: any) {
  const { manifest } = props

  const imageList = view(imageListLens, manifest) as Buda.Image[] || []
  const [isFetching, setIsFetching] = React.useState(false)
  const [fetchErr, setFetchErr] = React.useState(null)
  const [renderToIdx, setRenderToIdx] = React.useState(9) // eslint-disable-line no-magic-numbers
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [postErr, setPostErr] = React.useState(null)

  const search = window.location.search
  const params = new URLSearchParams(search)
  const volume = params.get("volume") || props.volume
  const instance = params.get("instance") || props.instance

  const [first, setFirst] = useState(volume)
  const [outlines, setOutlines] = useRecoilState(outlinesAtom)
  const [volNum, setVolNum] = useState(1)

  const { dispatch } = props

  const already = {}

  //console.log("vol:",volume,props,manifest)

  if (!volume && !manifest.isDefault) {
    manifest.isDefault = true
    if (manifest.imggroup) delete manifest.imggroup
  }

  // fix for hot reload triggering "Cannot have two HTML5 backends at the same time" error
  // (see https://github.com/react-dnd/react-dnd/issues/894#issuecomment-386698852)
  window.__isReactDndBackendSetUp = false

  const getOutline = async (rid) => {
    if (already[rid]) return
    already[rid] = true
    let data = await axios.get(`${config.TEMPLATES_BASE}query/graph/Outline_root?&R_RES=${rid}&format=jsonld`)
    if (data) {
      if (data.data) data = data.data
      if (data["@graph"]) data = data["@graph"]
      else data = [data]
      setOutlines({ ...outlines, [rid]: data })
    }
  }

  useEffect(() => {
    const getFirstVolume = async () => {
      if (instance && !volume) {
        const data = await axios.get(
          `${config.TEMPLATES_BASE}query/graph/Outline_root_pervolume?I_VNUM=1&R_RES=${instance}&format=jsonld`
        )
        //debug("outline:",data)
        if (data.data) {
          let graph = data.data
          if (data.data["@graph"]) graph = data.data["@graph"]
          else graph = [data.data]
          const root = graph.filter((n) => n.id === instance)
          if (root.length && root[0]["tmp:firstImageGroup"]?.id) setFirst(root[0]["tmp:firstImageGroup"].id)
        }
      }
    }
    if (!first) getFirstVolume()
    else if (!outlines[instance]) {
      getOutline(instance)
    }

    return () => {
      //console.log("unmounting BVMT")
    }
  }, [])

  useEffect(() => {
    setFetchErr(null)
    if (!volume && !first) {
      setIsFetching(false)
    } else {
      const getData = async () => {
        setIsFetching(true)
        try {
          const { manifest } = await getOrInitManifest(volume ? volume : first, {
            uiLanguage: "en",
          })
          setIsFetching(false)
          dispatch(setManifest(manifest))
        } catch (err) {
          setIsFetching(false)
          setFetchErr(err.message)
        }
      }
      getData()
    }
  }, [dispatch, volume, first])

  debug("i&v:", instance, volume, outlines, manifest)

  if (instance && !volume) {
    if (!first)
      return (
        <div style={{ textAlign: "center", padding: 100 }}>
          <CircularProgress />
        </div>
      )
    else return <Redirect to={"/outline?instance=" + instance + "&volume=" + first} />
  }

  const handleLoadMore = () => {
    setRenderToIdx(renderToIdx + 10) // eslint-disable-line no-magic-numbers
    // setting this isfetching stops the infinite scroll from getting caught in a loop
    setIsLoadingMore(true)
    setTimeout(() => {
      setIsLoadingMore(false)
    }, 3000) // eslint-disable-line no-magic-numbers
  }

  const imageListLength = imageList.length

  return (
    <ThemeProvider theme={theme}>
      <DndProvider backend={Backend}>
        <UpdateManifestError postErr={postErr} setPostErr={setPostErr} />
        {manifest.isDefault ? (
          <InstanceSearch
            history={props.history}
            isFetching={isFetching}
            fetchErr={fetchErr}
            {...(manifest && manifest["imggroup"] ? { forVolume: manifest["imggroup"] } : {})}
          />
        ) : (
          <div className="App" style={{ paddingTop: 125 }}>
            <div>
              <div className="container mx-auto">
                <InfiniteScroll
                  pageStart={0}
                  key={0}
                  loadMore={handleLoadMore}
                  hasMore={imageList.length > renderToIdx && !isLoadingMore}
                  loader={
                    <div key="circular" className="container mx-auto flex items-center justify-center">
                      <CircularProgress />
                    </div>
                  }
                  useWindow={true}
                >
                  {mapIndex(
                    (item: Buda.Image, i: number) => (
                      <React.Fragment key={i}>
                        <Card imageListLength={imageListLength} data={item} key={item.id} i={i} />
                        <OutlineInfo
                          imageListLength={imageListLength}
                          data={item}
                          key={item.id + "_outline-info"}
                          i={i}
                          instance={instance}
                          volume={volume}
                          volNum={volNum}
                          getOutline={getOutline}
                        />
                      </React.Fragment>
                    ),
                    imageList.slice(0, renderToIdx)
                  )}
                </InfiniteScroll>
              </div>
            </div>
          </div>
        )}
      </DndProvider>
    </ThemeProvider>
  )
}

const mapStateToProps = function (state: any) {
  return {
    manifest: state.manifest,
  }
}

const OutlineAppContainer = connect(mapStateToProps)(OutlineApp)

function OutlineEditorContainer(props) {
  const auth = useAuth0()
  const routerHistory = useHistory()

  return (
    <div>
      <div>
        <h1>Outline Editor</h1>
        <p>Work in progress</p>
        <OutlineAppContainer {...props} auth={auth} history={routerHistory} />
      </div>
    </div>
  )
}

export default OutlineEditorContainer
