import React, { useEffect, useRef, useState, useCallback } from "react"
import { Redirect } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { useHistory } from "react-router-dom"
import { connect } from "react-redux"
import { DndProvider } from "react-dnd"
import Backend from "react-dnd-html5-backend"
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles"
import CircularProgress from "@material-ui/core/CircularProgress"
import InfiniteScroll from "react-infinite-scroll-component"
import { lensPath, view, map, addIndex } from "ramda"
import axios from "axios"
import { useRecoilState } from "recoil"
import { useScrollDirection } from "react-use-scroll-direction"

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

let scrollY = 0

// there's nothing to extend because it's a functional component...
// so let's copy/paste what we need instead
function OutlineApp(props: any) {
  const { manifest } = props

  const imageList = view(imageListLens, manifest) as Buda.Image[] || []
  const [isFetching, setIsFetching] = React.useState(false)
  const [fetchErr, setFetchErr] = React.useState(null)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [postErr, setPostErr] = React.useState(null)

  const search = window.location.search
  const params = new URLSearchParams(search)
  const volume = params.get("volume") || props.volume
  const instance = params.get("instance") || props.instance

  const [first, setFirst] = useState(volume)
  const [outlines, setOutlines] = useRecoilState(outlinesAtom)
  const [volNum, setVolNum] = useState(1)

  const nbPages = 10
  const [start, setStart] = useState(Number(params.get("start") || props.start || 1))
  const [renderToIdx, setRenderToIdx] = React.useState(start + nbPages)

  const [breadcrumbs, setBreadcrumbs] = useState({})

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

  // getting "breadcrumbs" for each image
  useEffect(() => {
    getPageTitlePath()
  }, [])

  const getPageTitlePath = useCallback(
    (page = start, vol = volNum, id = instance) => {
      //debug("path:", page, vol) //, Object.keys(breadcrumbs))

      let node = "",
        sub,
        location,
        labels,
        parentId,
        siblings,
        partType,
        path = []

      do {
        //debug("id:", id, vol, page, path)

        if (id && !outlines[id]) {
          getOutline(id)
          break
        }
        node = outlines[id]?.filter((n) => n.id === id)
        if (node?.length && node[0].hasPart) {
          sub = node[0].hasPart
          if (sub && !Array.isArray(sub)) sub = [sub]
          if (sub?.length) {
            parentId = id
            siblings = outlines[id]
            sub = siblings.filter((n) => sub.includes(n.id))
            sub = _.orderBy(sub, ["partIndex"], ["asc"])

            //debug("sub:",sub,siblings)

            for (const index in sub) {
              partType = sub[index].partType
              location = sub[index].contentLocation
              //if(outlines[sub[index].id]) siblings = outlines[sub[index].id]
              //else siblings = outlines[parentId]
              if (location) {
                location = siblings?.filter((n) => location === n.id)
                if (location?.length) location = location[0]
              }
              id = sub[index].id
              labels = sub[index]["skos:prefLabel"]
              if (labels && !Array.isArray(labels)) labels = [labels]

              node = [sub[index]]

              //debug("index:",index,sub[index].id,sub[index],location)

              if (sub[index].hasPart) {
                if (
                  !location ||
                  location.contentLocationVolume == vol &&
                    location.contentLocationPage <= page &&
                    page <= location.contentLocationEndPage
                ) {
                  path.push({ id, location, labels, partType })
                  //debug("break:",path)
                  break
                }
              } else if (location) {
                if (
                  location.contentLocationVolume == vol &&
                  location.contentLocationPage <= page &&
                  page <= location.contentLocationEndPage
                ) {
                  //debug("last?", id, location, labels)

                  path.push({ id, location, labels, partType })

                  let endPage = imageListLength
                  if (location.contentLocationEndVolume === undefined && location.contentLocationEndPage)
                    endPage = location.contentLocationEndPage

                  const breadC = {}
                  let hasNew = false,
                    existLoca
                  for (let i = location.contentLocationPage; i <= endPage; i++) {
                    breadC["page-" + i] = [...path]
                    if (!(existLoca = breadcrumbs["page-" + i])) hasNew = true
                    else {
                      existLoca = existLoca[existLoca.length - 1]
                      if (existLoca.location && existLoca.location.id != location.id) {
                        hasNew = true
                        breadC["page-" + i] = [breadcrumbs["page-" + i], [...path]]
                      }
                    }
                  }

                  if (hasNew) {
                    //debug("new breadC:", location, breadC, breadcrumbs)
                    setBreadcrumbs({ ...breadcrumbs, ...breadC })
                  }

                  return
                }
              }
            }
          }
        }
      } while (node && node[0]?.hasPart)

      let p, q
      if (
        !breadcrumbs["page-" + page] &&
        (p = breadcrumbs["page-" + (page - 1)]) &&
        (q = breadcrumbs["page-" + (1 + page)])
      ) {
        if (p[p.length - 1].location?.contentLocationVolume === q[q.length - 1].location?.contentLocationVolume) {
          path = []
          for (const i in p) {
            path.push(p[i])
            if (p[i].partType === "bdr:PartTypeVolume") break
          }
          setBreadcrumbs({ ...breadcrumbs, ["page-" + page]: path })
        }
      }
    },
    [outlines, breadcrumbs]
  )

  //debug("bC:", breadcrumbs)

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

  //debug("i&v:", instance, volume, outlines, manifest)

  const imageListLength = imageList.length

  const refs = useRef([])

  let currentPage
  const threshold = 650,
    delay = 350
  const handleScroll = useCallback(
    (args) => {
      //debug("scroll:",args,scrollY,window.pageYOffset,isLoadingMore)

      if (scrollY < threshold && scrollY > window.pageYOffset) {
        currentPage = refs.current[start - 1 - 1]
        setIsLoadingMore(true)
        fetchMoreData(true)
        const inter = 10,
          timer = setInterval(() => {
            currentPage?.scrollIntoView()
          }, inter)
        setTimeout(() => {
          clearInterval(timer)
          setIsLoadingMore(false)
        }, delay)
      }

      scrollY = window.pageYOffset
    },
    [isLoadingMore]
  )

  const fetchMoreData = useCallback(
    (inverse = false) => {
      //debug("more!",renderToIdx)

      if (!inverse) {
        if (renderToIdx < imageListLength) setRenderToIdx(Math.min(renderToIdx + nbPages, imageListLength))
      } else {
        if (start > 1) setStart(Math.max(start - nbPages, 1))
      }
    },
    [start, renderToIdx]
  )

  if (instance && !volume) {
    if (!first)
      return (
        <div style={{ textAlign: "center", padding: 100 }}>
          <CircularProgress />
        </div>
      )
    else return <Redirect to={"/outline?instance=" + instance + "&volume=" + first} />
  }

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
                {isLoadingMore && (
                  <div key="circular" className="container mx-auto flex items-center justify-center">
                    <CircularProgress />
                  </div>
                )}
                <InfiniteScroll
                  dataLength={renderToIdx - start + 1}
                  next={fetchMoreData}
                  hasMore={imageList.length > renderToIdx || start > 1}
                  loader={
                    <div key="circular" className="container mx-auto flex items-center justify-center">
                      <CircularProgress />
                    </div>
                  }
                  onScroll={handleScroll}
                >
                  {mapIndex(
                    (item: Buda.Image, i: number) => (
                      <React.Fragment key={i}>
                        <Card imageListLength={imageListLength} data={item} key={item.id} i={i + start - 1} />
                        <OutlineInfo
                          refs={refs}
                          {...{ imageListLength, getPageTitlePath }}
                          data={item}
                          key={item.id + "_outline-info"}
                          i={i + start - 1}
                          title={breadcrumbs["page-" + (1 + i + start - 1)]}
                        />
                      </React.Fragment>
                    ),
                    imageList.slice(start - 1, renderToIdx)
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
