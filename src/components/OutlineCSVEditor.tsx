import React, { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo } from "react"
import { useRecoilState } from "recoil"
import Papa from 'papaparse';
import { ReactGrid, Column, Row, Id, MenuOption, SelectionMode, EventHandlers, pasteData, isMacOs } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import NotFoundIcon from "@material-ui/icons/BrokenImage"
import ErrorIcon from "@material-ui/icons/Error"
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Slider from '@material-ui/core/Slider';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import { CircularProgress } from "@material-ui/core"
import { fetchToCurl } from "fetch-to-curl"

import InstanceCSVSearch from "../components/InstanceCSVSearch"
import { uiTabState, localCSVAtom, uiLangState } from "../atoms/common"
import { entitiesAtom, EditedEntityState, defaultEntityLabelAtom } from "../containers/EntitySelectorContainer"
import config from "../config"
import * as ns from "../helpers/rdf/ns" 
import { langs } from "../helpers/lang"
import ResourceSelector from "../routes/entity/containers/ResourceSelector"

const debug = require("debug")("bdrc:csved")

interface OutlineEntry {
  RID:string,
  position:boolean[],
  partType:string,
  label:string,
  titles:string,
  work:string,
  notes:string,
  colophon:string,
  identifiers:string,
  imgStart:number,
  imgEnd:number,
  imgGrpStart:number,
  imgGrpEnd:number
}

const colWidths = { 
  "RID":40, "Position": 40, "part type":90, 
  "label":250, "titles":500, "work": 250, "colophon": 500, "identifiers": 250,
  "img start": 110, "img end": 110, "img grp start":110, "img grp end":110 
}

const colLabels = { }  // "img start":"im. start", "img end": "im. end", "img grp start":"im.grp start", "img grp end": "im.grp end" }

const parts = "T,S,V,C,E,TOC".split(",")

let styleSheet, globalHeaderRow, mayAddEmptyData

const patchLine = (line:string) => {
  let patched = line.split(/\t/).map(l => l.replace(/^[xX+]$/,"1"))
  let numPosFrom = patched.findIndex(p => parts.includes(p)) - 1
  if(numPosFrom < 0) numPosFrom = patched.length - 12 // eslint-disable-line
  const numPosTo = globalHeaderRow?.cells.filter(c => c.text.startsWith("pos.")).length 
  debug("b:", numPosFrom, numPosTo, patched)
  if(numPosFrom > numPosTo) {
    for(let i = numPosFrom - numPosTo ; i > 0 ; i--) {
      patched = [ patched[0], ...patched.slice(2) ] // eslint-disable-line no-magic-numbers
      debug("patched:",patched)
    }
  } else if(numPosFrom < numPosTo) {
    for(let i = numPosTo - numPosFrom ; i > 0 ; i--) {
      patched = [ patched[0], "", ...patched.slice(1) ] // eslint-disable-line no-magic-numbers
      debug("patched:",patched)
    }
  }
  return patched.join("\t")
}

const myHandlePaste = (text:string, state: State): State => {
  const activeSelectedRange = state.selectedRanges[state.activeSelectedRangeIdx]
  if (!activeSelectedRange) {
    return state;
  }  
  let pastedRows: Compatible<Cell>[][] = [];
  pastedRows = text
    .split("\n")
    .filter(l => l)
    .map((line: string) =>
      patchLine(line)
        .split("\t")
        .map((t) => ({ type: "text", text: t, value: parseFloat(t) }))
    );
  setTimeout(() => window.dispatchEvent(new Event('resize')), 10)  // eslint-disable-line 
  return { ...pasteData(state, pastedRows) };
}

class MyEventHandlers extends EventHandlers {
  copyHandler = (event: ClipboardEvent): void => { 
    debug("ctrl-c:", event)    
    this.updateState(state => state.currentBehavior.handleCopy(event, state));
  }
  pasteHandler = async (event: ClipboardEvent): void => { 
    debug("ctrl-v:", event)
    const text = event.clipboardData.getData("text/plain")
    const n = text.split("\n").filter(l => l).length
    mayAddEmptyData(n, text, false, event)
    event.preventDefault();
  }
  cutHandler = (event: ClipboardEvent): void => { 
    debug("ctrl-x:", event)
    this.updateState(state => state.currentBehavior.handleCut(event, state));
  }
}

let timeout = 0
class MyReactGrid extends ReactGrid {
  eventHandlers = new MyEventHandlers(
    this.stateUpdater,
    this.pointerEventsController
  );
  componentDidUpdate(prevProps: ReactGridProps, prevState: State): void {
    super.componentDidUpdate(prevProps, prevState, this.state);
    //debug("cDu:", this.state, this.props,  this.state.focusedLocation?.row, this.props.focusedLocation?.row)
    if(this.state.contextMenuPosition.top !== -1) { 
      const menu = document.querySelector(".rg-context-menu")
      if(!menu) return
      const bbox = menu.getBoundingClientRect()
      const maxPos = window.innerHeight - 60 - bbox.height - 15; // eslint-disable-line
      if(this.state.contextMenuPosition.top > maxPos) {
        this.updateState({ contextMenuPosition: { top: maxPos, left: this.state.contextMenuPosition.left } })
      }
    }
    if(this.state.focusedLocation && !this.props.focusedLocation
      || !this.state.focusedLocation && this.props.focusedLocation && Object.keys(this.props.focusedLocation).length
      || this.state.focusedLocation && this.props.focusedLocation 
          && ( this.state.focusedLocation?.column?.idx != this.props.focusedLocation?.column?.idx 
            || this.state.focusedLocation?.row?.rowId != this.props.focusedLocation?.row?.rowId)
     ) {
      //debug("focus:", this.state.focusedLocation, this.props.focusedLocation)
      this.props.setFocusedLocation({ ...this.state.focusedLocation })
    }
    if(this.state.currentlyEditedCell) {
      this.props.onEditing(true)
    } else {
      this.props.onEditing(false)
    }
    if(this.state.highlightLocations?.length) {
      if(timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        const hiCells = document.querySelectorAll(".rg-cell-highlight") //.map(h => h.style)
        if(!hiCells?.length) return
    
        // build a "map" of currently displayed cells
        const headerMap = {}, rowsMap = {}
        let elem = document.querySelector(".rg-pane > .rg-cell:first-child"), nCol = 0, top, firstRow, firstCol
        do {
          nCol = Number(elem.getAttribute("data-cell-colidx"))
          headerMap[parseInt(elem.style.left, 10)] = nCol
          if(!top) { 
            top = elem.style.top
            if(!(firstRow = Number(elem.getAttribute("data-cell-rowidx")))) firstRow = 0
            else firstRow = firstRow - 1
            firstCol = nCol
          }
          elem = elem.nextElementSibling
        } while(elem.style.top === top)
        document.querySelectorAll(".rg-cell:not(.rg-header-cell)[data-cell-colidx='"+firstCol+"']")
          .forEach( (e,i) => rowsMap[parseInt(e.style.top, 10)] = i)
        
        // identify coordinates of each highlighted cell using html attributes of given cell
        hiCells.forEach((c,i) => {
          const row = firstRow + rowsMap[parseInt(c.style.top,10)+1] + 1
          let col = headerMap[parseInt(c.style.left, 10)] 
          if(col === undefined) col = headerMap[parseInt(c.style.left, 10)+1]
          col = firstCol + col
          const htmlCell = document.querySelector(".rg-cell[data-cell-colidx='"+col+"'][data-cell-rowidx='"+row+"']")
          const msg = this.props.errorData.find(m => row === m.row && 
              (col === m.col-1 || !m.col && this.state.cellMatrix.columns[col]?.columnId?.startsWith("position")))?.msg
          if(htmlCell) htmlCell.setAttribute("title", msg)
          //debug("c?", i, c.style.top, c.style.left, row+","+col, htmlCell, msg)              
        })
        
        //debug("hC?",this.state.highlightLocations, headerMap, rowsMap, hiCells)

      }, 150) // eslint-disable-line
    }
  }
}

let unmount

export default function OutlineCSVEditor(props) {
  const { RID } = props
  const [tab, setTab] = useRecoilState(uiTabState)
  const [csv, setCsv] = useState("")
  const [outlineData, setOutlineData] = useState<OutlineEntry[]>([])
  const [emptyData, setEmptyData] = useState<OutlineEntry>()
  const [columns, setColumns] = useState<Column[]>([]);
  const [headerRow, setHeaderRow] = useState<Row>()
  globalHeaderRow = headerRow  

  const [localCSV, setLocalCSV] = useRecoilState(localCSVAtom)

  const reactgridRef = useRef<MyReactGrid>(null)

  //debug("ref:", reactgridRef, outlineData, headerRow)

  const [statusValues, setStatusValues] = useState()
  const [status, setStatus] = useState(ns.BDA("StatusReleased").value)
  const [attrib, setAttrib] = useState("")

  useEffect(() => {
    unmount = false 

    const getOntology = async() => {
      try {
        const obj = await (await fetch("https://purl.bdrc.io/ontology/data/json")).json()
        const status = Object.keys(obj)
          .filter(v => obj[v][ns.RDF("type").value]?.some(t => t.value === ns.ADM("Status").value))
          .reduce((acc,s) => ({ ...acc, [s]:obj[s] }),{})          
        debug("status:", status)
        setStatusValues(status)
      } catch(e) {
        debug("error:",e)
        throw new Error("couldn't fetch ontology")
      }
    } 

    const updateBodyFocus = (event) => {

      // TODO: fix conflict with TextField/Select
      return

      if(document.activeElement?.tagName === "BODY" 
          && !event.relatedTarget?.id?.includes("select") // fix for part type select behavior
        ) {
        const elem = reactgridRef.current?.state?.reactGridElement?.parentElement?.parentElement
        debug("focusout", event, elem, event.relatedTarget?.id)
        if(elem) {
          elem.setAttribute("tabIndex", -1)
          elem.focus()        
        }
      }
    }
    
    getOntology()
    document.addEventListener('focusout', updateBodyFocus)    
    return () => {
      unmount = true
      document.removeEventListener("focusout", updateBodyFocus)
    }    
  }, [])

  const handleColumnResize = (ci: Id, width: number) => {
      setColumns((prevColumns) => {
          const columnIndex = prevColumns.findIndex(el => el.columnId === ci);
          const resizedColumn = prevColumns[columnIndex];
          const updatedColumn = { ...resizedColumn, width };
          prevColumns[columnIndex] = updatedColumn;
          return [...prevColumns];
      });
  }

  const makeRow = (d:[], head: Row, fromPaste = false) => { 
    const position = []
    head.cells.map( (c,j) => {
      if(c.text.startsWith("pos.")) position.push((d[j] || "").toUpperCase() === "X" || fromPaste && d[j] === "1")
    });
    const idx = position.length + 1
    return {
      //eslint-disable-next-line no-magic-numbers
      RID:d[0], position, partType:d[idx], label:d[idx+1], titles:d[idx+2], work:d[idx+3], notes:d[idx+4], colophon:d[idx+5], identifiers:d[idx+6],
      //eslint-disable-next-line no-magic-numbers
      imgStart:Number(d[idx+7]), imgEnd:Number(d[idx+8]), imgGrpStart:Number(d[idx+9]), imgGrpEnd:Number(d[idx+10]),
      
      isTypeOpen: false
    }
  }

  const createGlobalChange = useCallback((prevData, nextData, n, at, columnsData?) => [{ 
    type:"global", 
    previousCell: { 
      type: "global", 
      "rows": prevData, 
      ...columnsData ? { "columns": { emptyData, columns, headerRow } } : {} 
    },
    newCell: { 
      type: "global", 
      "rows": nextData, 
      n, 
      at, 
      ...columnsData ?  { "columns": columnsData } : {} 
    },
  }], [columns, emptyData, headerRow])
  
  const [highlights, setHighlights] = useState<Highlight[]>([])  
  const [errorData, setErrorData] = useState()

  const updateErrorData = useCallback((n = 0, at = -1) => {
    debug("uEd:", errorData, n,at) 
    if(!errorData?.length) return
    let modified = false
    const data = []
    for(const d of errorData) {
      const e = { ...d }
      if(e.row - 1 >= at) { 
        e.row += n
        modified = true
      }
      data.push(e)
    }
    if(modified) setErrorData(data)
  }, [errorData])

  const applyNewValue = useCallback((
    changes: CellChange[],
    prevEntry: OutlineEntry[],
    callbacks:(()=>void)[],
    usePrevValue = false
  ): OutlineEntry[] => {
    
    debug("changes:", changes, highlights, errorData)

    let modified = false
    const hiMap = {}
    for(const h of highlights) hiMap[h.rowId+","+h.columnId] = h

    changes.forEach((change, n) => {      
      const entryIndex = change.rowId;
      const fieldName = change.columnId;
      const nextCell = usePrevValue ? change.previousCell : change.newCell;
      const prevCell = usePrevValue ? change.newCell : change.previousCell;
      
      if(hiMap[entryIndex+","+fieldName]) {
        hiMap[entryIndex+","+fieldName].modified = !usePrevValue
        modified = true
        if(fieldName.startsWith("position")) Object.keys(hiMap).map(h => {
          if(hiMap[h].rowId === entryIndex && hiMap[h].columnId.startsWith("position")) {            
            hiMap[h].modified = hiMap[entryIndex+","+fieldName].modified
          }
        })
      }

      if(usePrevValue) {
        debug("undo",change.type)
        if (change.type === 'global') {
          if(nextCell.rows) {
            prevEntry = nextCell.rows
          } 
          if(nextCell.columns) {
            callbacks.push(() => { 
              setHeaderRow(nextCell.columns.headerRow)
              setColumns(nextCell.columns.columns)
              setEmptyData(nextCell.columns.emptyData)
            })
          } else {            
            if(prevCell.n !== undefined && prevCell.at !== undefined) callbacks.push(() => updateErrorData(-prevCell.n, prevCell.at))
          }
        } else if (change.type === 'checkbox') {
          const n_pos = Number(fieldName.replace(/^[^0-9]+/g,""))  
          prevEntry[entryIndex].position[n_pos - 1] = nextCell.checked;
          if(!nextCell.checked && nextCell.n_pos) prevEntry[entryIndex].position[nextCell.n_pos - 1] = true
        } else if (change.type === 'text') {
          prevEntry[entryIndex][fieldName] = nextCell.text;
        } else if (change.type === 'number') {
          prevEntry[entryIndex][fieldName] = nextCell.value;
        } else if (change.type === 'dropdown') {
          prevEntry[entryIndex].isTypeOpen = false
          prevEntry[entryIndex][fieldName] = nextCell.selectedValue
        }
        return
      }

      // more than 2 change (duplicate when editing RID in a loaded csv) ==> copy/paste = don't paste RID in first column
      if(changes.length > 2 && fieldName === "RID") { // eslint-disable-line
        debug("changes:RID")
        return
      }
      
      if (change.type === 'global') {
        if(nextCell.rows) {
          prevEntry = nextCell.rows
        } 
        if(nextCell.columns) {
          callbacks.push(() => { 
            setHeaderRow(nextCell.columns.headerRow)
            setColumns(nextCell.columns.columns)
            setEmptyData(nextCell.columns.emptyData)
          })
        } else {          
          if(nextCell.n !== undefined && nextCell.at !== undefined) callbacks.push(() => updateErrorData(nextCell.n, nextCell.at))
        }
      } else if (change.type === 'checkbox') {
        const numChecked = prevEntry[entryIndex].position.reduce((acc,e) => acc + (e ? 1 : 0), 0)
        const n_pos = Number(fieldName.replace(/^[^0-9]+/g,""))
        //debug("nC:", n_pos, numChecked, prevEntry[entryIndex])        
        if(numChecked !== 1 || nextCell.checked || changes.length > 1) { // && !changes[0].newCell.text) { 
          prevEntry[entryIndex].position[n_pos - 1] = nextCell.checked;
          if(nextCell.checked) {
            for(const i in prevEntry[entryIndex].position) {              
              if(Number(i) !== Number(n_pos - 1)) { 
                if(prevEntry[entryIndex].position[i]) prevCell.n_pos = 1+Number(i)
                prevEntry[entryIndex].position[i] = false 
              }
            }
          }
        }
      } else if (change.type === 'text') {
        prevEntry[entryIndex][fieldName] = nextCell.text;
      } else if (change.type === 'number') {
        debug("num:", change, fieldName)
        if(nextCell.value !== "" && !isNaN(nextCell.value)) { 
          let v = nextCell.value
          if(v < 1) v = 1
          if(v > 2000) v = 2000 // eslint-disable-line no-magic-numbers
          prevEntry[entryIndex][fieldName] = v;
        }
        else if(nextCell.text === '') prevEntry[entryIndex][fieldName] = '';
      } else if (change.type === 'dropdown') {
        debug("dd:", change, fieldName)
        prevEntry[entryIndex].isTypeOpen = nextCell.isOpen
        if(nextCell.selectedValue && nextCell.selectedValue !== prevCell.selectedValue)       
          prevEntry[entryIndex][fieldName] = nextCell.selectedValue
      }
    });

    if(modified) setHighlights(Object.values(hiMap))

    return [...prevEntry];
  }, [highlights, updateErrorData, errorData]);
  
  const [cellChangesIndex, setCellChangesIndex] = useState(() => -1);
  const [cellChanges, setCellChanges] = useState<CellChange[][]>(() => []);

  useEffect(() => {
    debug("index:", cellChanges, cellChangesIndex)
  }, [cellChanges, cellChangesIndex])

  const applyChangesToOutlineData = useCallback((
    changes: CellChange<TextCell>[],
    prevOutlineData: OutlineData[]
  ): OutlineData[] => {
    const callbacks = []
    const updated = applyNewValue(changes, prevOutlineData, callbacks);
   
    const newChanges = changes.filter( // undo/redo dropdown change in one step
      (c, i) => c.type !== "dropdown" || c.previousCell.selectedValue !== c.newCell.selectedValue
    )
    if(newChanges.length) {      
      
      let firstToMerge
      const previousChanges = [ ...cellChanges.slice(0, cellChangesIndex + 1), newChanges ]
        .reduce((acc, c, i) => { // merge all changes to top input since it has focus
          if(c.length === 1 && c[0].merged !== undefined 
              && (!firstToMerge || firstToMerge[0].rowId === c[0].rowId && firstToMerge[0].columnId === c[0].columnId)
            ) {
            if(!firstToMerge) firstToMerge = c 
            else firstToMerge[0].newCell = c[0].newCell 
          } else {
            if(firstToMerge) {
              firstToMerge[0].merged = true
              acc.push(firstToMerge)
              firstToMerge = undefined
            }
            acc.push(c)            
          }
          return acc
        },[]) 
      if(firstToMerge) {
        firstToMerge[0].merged = true
        previousChanges.push(firstToMerge)
      }
      //debug("pc:", previousChanges)

      setCellChanges(previousChanges);
      setCellChangesIndex(previousChanges.length - 1);
    }
    callbacks.map(c => setTimeout(c, 1)) // eslint-disable-line
    return updated;
  }, [applyNewValue, cellChanges, cellChangesIndex, errorData]);
  
  const redoChanges = useCallback((
    changes: CellChange<TextCell>[],
    prevOutlineData: OutlineData[]
  ): OutlineData[] => {
    const callbacks = []
    const updated = applyNewValue(changes, prevOutlineData, callbacks);
    setCellChangesIndex(cellChangesIndex + 1);
    callbacks.map(c => setTimeout(c, 1)) // eslint-disable-line
    return updated;
  }, [applyNewValue, cellChangesIndex, errorData, updateErrorData]);

  const undoChanges =  useCallback((
    changes: CellChange<TextCell>[],
    prevOutlineData: OutlineData[]
  ): OutlineData[] => {
    const callbacks = []
    const updated = applyNewValue(changes, prevOutlineData, callbacks, true);
    setCellChangesIndex(cellChangesIndex - 1);
    callbacks.map(c => setTimeout(c, 1)) // eslint-disable-line
    return updated;
  }, [applyNewValue, cellChangesIndex, errorData, updateErrorData]);

  const addEmptyData = useCallback((numRows:number, text:string, insert = false, event?: ClipboardEvent, n?:number, at?:number) => {
    const firstRowIdx = reactgridRef.current.state.selectedRanges[0].first.row.rowId
    const numFrom = outlineData.length
    const numTo = (insert ? numFrom : firstRowIdx) + numRows
    debug("oD:", numFrom, numTo, event, reactgridRef.current.state)
    // keep default behavior if not pasting full line (first cell of row)
    if(!text.includes("\t")
        || event && reactgridRef.current.state.selectedRanges.length && reactgridRef.current.state.selectedRanges[0].first.column.idx !== 0 
      ) {
      reactgridRef.current.updateState(state => state.currentBehavior.handlePaste(event, state)) 
      setTimeout(() => window.dispatchEvent(new Event('resize')), 10)  // eslint-disable-line 
      return
    }
    if(numTo > numFrom) {
      let newData = insert ? [ ...outlineData.slice(0, firstRowIdx) ] : [ ...outlineData ]
      for(let i = 0 ; i < numTo - numFrom ; i++) newData.push({ ...emptyData, position:[...emptyData.position] })
      if(insert) newData = newData.concat([ ...outlineData.slice(firstRowIdx) ])
      // now rewrite data using clipboard
      const pasted = text.split("\n").filter(l => l)
      for(let i = 0 ; i < pasted.length ; i++) {
        const rowIdx = reactgridRef.current.state.selectedRanges[0].first.row.rowId
        newData[rowIdx + i] = makeRow([newData[rowIdx + i].RID].concat(patchLine(pasted[i]).split("\t").slice(1)), headerRow, true)
      }
      setOutlineData(applyChangesToOutlineData(createGlobalChange(outlineData, newData, n, at), newData))      
    } else {
      reactgridRef.current.updateState(state => myHandlePaste(text, state)) 
    } 
  }, [outlineData, applyChangesToOutlineData, createGlobalChange, emptyData, headerRow])
  mayAddEmptyData = addEmptyData

  const [focusVal, setFocusVal] = useState("")

  const handleChanges = (changes: CellChange<TextCell>[]) => { 
    setOutlineData((prevEntry) => applyChangesToOutlineData(changes, prevEntry)); 
  }; 

  const handleUndoChanges = useCallback(() => {
    if(focusVal) setFocusVal("")
    if (cellChangesIndex >= 0) {
      setOutlineData((prevOutlineData) =>
        undoChanges(cellChanges[cellChangesIndex], prevOutlineData)
      );
    }
  }, [cellChanges, cellChangesIndex, focusVal, undoChanges]);

  const handleRedoChanges =  useCallback(() => {
    if(focusVal) setFocusVal("")
    if (cellChangesIndex + 1 <= cellChanges.length - 1) {
      setOutlineData((prevOutlineData) =>
        redoChanges(cellChanges[cellChangesIndex + 1], prevOutlineData)
      );
    }
  }, [cellChanges, cellChangesIndex, focusVal, redoChanges]);

  const [ fontSize, setFontSize ] = useState<number>(20) // eslint-disable-line no-magic-numbers
  const [ rowHeight, setRowHeight ] = useState<number>(36) // eslint-disable-line no-magic-numbers

  useEffect(() => {
    if(headerRow && headerRow?.height !== rowHeight) {
      setHeaderRow({ ...headerRow, height:rowHeight })
    }
  }, [rowHeight, headerRow])

  useEffect(() => {
    if(!styleSheet) {
      const styleEl = document.createElement("style");
      document.head.appendChild(styleEl);
      styleSheet = styleEl.sheet;
    }
    if(styleSheet.cssRules.length) styleSheet.removeRule(0)
    styleSheet.insertRule(".rg-celleditor input:not([inputmode='decimal']) { font-size: "+fontSize
      +"px; display:inline-block; margin-top: "+ fontSize/7   +"px}")  // eslint-disable-line no-magic-numbers
  }, [fontSize])

  const [error, setError] = useState("")
  const [entities, setEntities] = useRecoilState(entitiesAtom)

  const fetchCsv = useCallback(async () => {
    if (RID && !csv) {
      setCsv(true)
      let resp
      try {
        let text
        if(!localCSV) {
          resp = await fetch(config.API_BASEURL + "outline/csv/" + RID)
          if(resp.status === 404) throw new Error(await resp.text()) //eslint-disable-line
          text = await resp.text()
          const attr = resp.headers.get('x-outline-attribution')          
          if(attr) setAttrib(decodeURIComponent(attr).replace(/(^")|("(@en)?$)/g, ""))
          const stat = resp.headers.get('x-status')
          if(stat) setStatus(stat.replace(/^<|>$/g, ""))
        } else {
          text = localCSV
        }
        if(text) text = text.replace(/\n$/m,"")

        let index = entities.findIndex((e) => e.subjectQname === "bdr:O_"+RID)
        const newEntities = [...entities]
        if (index === -1) {
          newEntities.push({
            subjectQname: RID,
            state: localCSV ? EditedEntityState.NeedsSaving : EditedEntityState.Saved,
            shapeRef: "tmp:outline",
            subject: null,
            subjectLabelState: defaultEntityLabelAtom,
            //alreadySaved: etag,
          })
          index = newEntities.length - 1
        } 
        setEntities(newEntities)

        setCsv(text)
        Papa.parse(text, { worker: true, delimiter:",", complete: (results) => {
          let n_pos = 1
          const head = {
            rowId: "header",
            height: rowHeight,
            cells: results.data[0].map( d => ({ type: "header", text: d === "Position" ? "pos. " + n_pos++ : colLabels[d] || d }))
          }
          setHeaderRow(head)

          debug("results:", results)

          const data = results.data.map((d,i) => {
            if(i>0 && d) return makeRow(d, head)
          }).filter(d => d) /* && d.RID) // RID can be empty */

          const position = []
          head.cells.map( (c,j) => {
            if(c.text.startsWith("pos.")) position.push(false)
          });
          const empty = {
            RID:"", position, partType:"T", label:"", titles:"", work:"", notes:"", colophon:"", identifiers:"",
            imgStart:"", imgEnd:"", imgGrpStart:"", imgGrpEnd:"",             
            isTypeOpen: false
          }
          setEmptyData(empty)

          if(!data?.length) { 
            setOutlineData([{ ...empty, position: [ ...empty.position ] }])
          }
          else {
            setOutlineData(data)
          }

          setCellChangesIndex(-1);
          setCellChanges([]);
          setFocusVal("")

          n_pos = 0
          setColumns(head.cells.map( ({ text }, i) => { 
            debug("w:", text, i, colWidths)
            return { 
              columnId: results.data[0][i].replace(/ (.)/g,(m,g1) => g1.toUpperCase()).replace(/Position/,"position" + n_pos++),
              resizable:true,
              width: colWidths[results.data[0][i]] || 150 // eslint-disable-line no-magic-numbers
            }}) || []
          ) 

        } })
      } catch(e) {
        // TODO: error fetching csv (401/403, 404)          
        debug("ERROR", resp, e)
        setError(e.message)
      }
    }
  }, [RID, csv, entities, localCSV, rowHeight])

  useEffect(() => {
    debug("localCSV?", RID, csv||"--", localCSV)
    fetchCsv()
  }, [RID, csv, localCSV])

  // TODO: add outline in left bar
  useEffect(() => {
    if (tab != -1) setTab(-1)
  }, [tab])

  /* // check 
  useEffect(() => {

  }, [outlineData])
  */

  const handlePaste = (e) => {
    e.persist()
    debug("paste:",e)
  }    

  const [fullscreen, setFullscreen] = useState(false)

  const [focusedLocation, setFocusedLocation] = useState<Location>()

  useLayoutEffect(() => {
    if(reactgridRef.current?.state.reactGridElement) window.dispatchEvent(new Event('resize'))    
  }, [fullscreen])  
  
  const [multiline, setMultiline] = useState(false)

  const focusPre = useMemo(() => 
    focusedLocation?.row && focusedLocation?.column && outlineData?.length > focusedLocation.row.rowId 
      && ![ /*"RID", "work"*/ "partType"].includes(focusedLocation?.column?.columnId) // why not edit RID in top field??
        ? outlineData[focusedLocation.row.rowId][focusedLocation.column.columnId] 
        : undefined, 
    [focusedLocation, outlineData]
  )

  const [editing, setEditing] = useState(false)
  const onEditing = (val:boolean) => setEditing(val)

  const focus = focusVal || focusPre

  useEffect(() => {
    setFocusVal("")
  }, [focusedLocation])  

  const updateInputFromCell = useCallback(() => {
    if(editing) {
      const input = document.querySelector(".rg-celleditor input")
      let timer = 0
      if(input) {
        input.addEventListener("keyup", (ev) => {                     
          const cursor = input.selectionStart
          debug("ev:", ev, focusVal, input.value, cursor) //, timer)
          if(timer) clearTimeout(timer)           
          timer = setTimeout(() => {
            debug("to!", focusPre, focus, focusVal, input.value)
            if(focusVal !== input.value) { 
              setFocusVal(input.value)        
              if((!ev.key.startsWith("Arrow") || !focusVal) && ev.key !== "Shift"){ 
                input.selectionStart = input.selectionEnd = cursor 
              }
            }
          }, 650) // eslint-disable-line
        })
      }
    } else {
      setFocusVal("")
    }
  }, [editing, focusVal, focus, focusPre])

  useEffect(() => {
    updateInputFromCell()
  }, [editing])

  const topInputRef = useRef(null)

  const handleInputChange = useCallback((ev) => {
    const newVal = ev.currentTarget.value.split(/\n|;+/).join(";;")
    const changes = [{ 
      type:"text", 
      rowId: focusedLocation.row.rowId, 
      columnId: focusedLocation.column.columnId, 
      previousCell: { type: "text", text: focus },
      newCell: { type: "text", text: newVal },
      merged: false      
    }]
    //debug("change!", ev.currentTarget.value, focus, changes)
    setOutlineData(applyChangesToOutlineData(changes, outlineData))
    setFocusVal(newVal)
  }, [focusedLocation, outlineData, focusVal, focus])

  const handleInputBlur = () => {
    debug("blur")
    const previousChanges = [ ...cellChanges ]
    if(previousChanges.length && previousChanges[previousChanges.length - 1].length 
        && previousChanges[previousChanges.length - 1][0].merged !== undefined) {
      delete previousChanges[previousChanges.length - 1][0].merged
      setCellChanges(previousChanges)
    }
  }

  const [saving, setSaving] = useState(false)
  const [popupOn, setPopupOn] = useState(false)
  const [curl, setCurl] = useState("")
  const [errorCode, setErrorCode] = useState(0)
  const wrongEtagCode = 412
  const [message, setMessage] = useState("")
  const [uiLang, setUiLang] = useRecoilState(uiLangState)
  const [lang, setLang] = useState(uiLang)

  const rowToCsv = useCallback((o) => {
    //debug("o:",o,columns)
    let res = [], c = 0
    // RID
    res.push(o[columns[c].columnId])
    // position
    do {
      c++
    } while(columns[c].columnId.startsWith("pos"))    
    res = res.concat(o.position.map(p => p ? "X" : ""))
    // all other fields
    res.push(o[columns[c++].columnId])
    res.push(o[columns[c++].columnId])
    res.push(o[columns[c++].columnId])
    res.push(o[columns[c++].columnId])
    res.push(o[columns[c++].columnId])
    res.push(o[columns[c++].columnId])
    // img. / vol.
    do {
      res.push(o[columns[c++].columnId] || "")
    } while(columns.length > c)
    return res.map(r => JSON.stringify(r)).join(",") 
  }, [columns])

  const toCSV = useCallback(() => {
    return headerRow.cells.map(c => '"'+c.text.replace(/pos\..*/, "Position")/*.replace(/im./,"img").replace(/vol./,"volume")*/+'"').join(",")
              + "\n" + outlineData.map(rowToCsv).join("\n")+"\n"
  }, [headerRow, outlineData, rowToCsv])

  const resetPopup = () => {
    setPopupOn(false)
    setMessage("")
    setErrorCode(0)
    setError("")
  }

  const resetError = () => {
    setErrorCode(0)
    setError("")
    setErrorData([])
    setHighlights([])
  }
  const updateHighlights = useCallback((oD = outlineData) => {
    debug("uH:", errorData, highlights, oD) 

    /*
    // TODO: better than nothing (removes inconsistent highlighting) but can do better! --> updateErrorData or something
    if(highlights.some(h => h.rowId >= oD.length)) { 
      setHighlights([])
      return
    }
    */
   
    if(!errorData?.length) {      
      return
    }
    const data = []
    for(const d of errorData) {
      const e = {}
      e.rowId = d.row - 1      
      e.borderColor = "#ff0000"
      if(!d.col && d.msg === "missing position") {
        columns.filter(c => c.columnId.startsWith("position")).map(c => data.push({ ...e, columnId:c.columnId }))
      } else { 
        e.columnId = columns[d.col - 1].columnId
        data.push(e)
      }
    }
    setHighlights(data)
  }, [ errorData, columns, outlineData, highlights ])

  useEffect(() => {
    updateHighlights()
  }, [ errorData ])

  const save = useCallback(async () => {
    
    setSaving(true)
    resetError()
    await new Promise(r => setTimeout(r, 10)); // eslint-disable-line
    
    const idToken = localStorage.getItem("BLMPidToken")

    const headers = new Headers()
    headers.set("Content-Type", "text/csv")
    headers.set("Authorization", "Bearer " + idToken)
    headers.set("Accept","application/json")
    //if (previousEtag) headers.set("If-Match", previousEtag)
    if(status) headers.set("X-Status", "<"+status+">") //.split(":")[1]) // returns 415 "status must be (...)"
    if(attrib) headers.set("X-Outline-Attribution", encodeURIComponent('"'+attrib+'"@en'))
    if(message) headers.set("X-Change-Message", encodeURIComponent('"'+message+'"@'+lang))

    const method = "PUT"

    const body = toCSV()
    debug("body:", body)

    const url = config.API_BASEURL + "outline/csv/" + RID
    let code = 1, curl, err
    
    try {
      curl =
        fetchToCurl(url, { headers, method, body }).replace(
          /--data-binary '((.|[\n\r])+)'$/gm,
          (m, g1) => "--data-raw $'" + g1.replace(/(['"])/g, "\\$1") + "'"
        ) + " --verbose"

      const resp = await fetch(url, { headers, method, body  })        
      if(![200, 201].includes(resp.status)) {  //eslint-disable-line
        code = resp.status
        err = await resp.json()
        throw new Error(err.map(e => e.msg+(e.row?" row "+e.row:"")+(e.col?" col "+e.col:"")).join("; ")) 
      } 
      await fetch("https://ldspdi.bdrc.io/clearcache", { method: "POST" })
      resetPopup()
    } catch(e) {
      debug(e)
      // TODO: popup with commit/error message
      //setError(e.message.split("; ").map((m,i) => <div key={i}>{m}</div>) || "error when saving/clearing cache")
      if(code === 500) setError("error "+err.status+" when saving "+url) // eslint-disable-line
      else setError(e.message.split("; ").length + " errors were encountered, please check the cells highlighted in red") 
      setErrorCode(code)
      setErrorData(err)
      setCurl(curl)
    }

    setSaving(false)
        
  }, [status, attrib, message, lang, toCSV, RID])
   
  const handleDownloadCSV = useCallback(() => {
    const link = document.createElement("a");
    const file = new Blob([toCSV()], { type: 'text/plain' });
    link.href = URL.createObjectURL(file);
    link.download = RID.replace(/^[^:]+:/, "") + ".csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }, [toCSV, RID])

  const [isFetching, setIsFetching] = useState(false)
  const [fetchErr, setFetchErr] = useState(null)

  const columnMenu = useCallback((
    selectedRowIds: Id[],
    selectedColIds: Id[],
    selectionMode: SelectionMode,
    menuOptions: MenuOption[]
  ): MenuOption[] => { 
    if(selectedColIds.length === 1 && selectedColIds[0].startsWith("position")) menuOptions.push({
      id: "insertColumn",
      label: "Add position column",
      handler: () => {
        const newColId = columns.filter(c => c.columnId.startsWith("position") ).length + 1
        const m = columns.findIndex(c => c.columnId === selectedColIds[0])
        const colPos = Number(selectedColIds[0].replace(/[^0-9]+/g,""))-1
        const lastPos = columns.findIndex((c,i) => 
          i > 0 && columns[i-1].columnId.startsWith("position") && !c.columnId.startsWith("position")
        )
        const newData = outlineData.map(d => ({ 
          ...d, 
          position:[
            ...d.position.slice(0,colPos), 
            false,
            ...d.position.slice(colPos), 
          ] 
        }))

        let n_pos = 1
        const newColumns = [
          ...columns.slice(0, lastPos), { 
            columnId: "position" + newColId,
            resizable:true,
            width: colWidths["Position"] 
          }, 
          ...columns.slice(lastPos)
        ].map(c => {
          if(c.columnId.startsWith("position")) return { ...c, columnId:"position"+n_pos++ }
          else return c
        })

        n_pos = 1
        const newHeaderRow = { 
          ...headerRow,  
          cells:[
            ...headerRow.cells.slice(0, m), { 
              type: "header", text: "pos. "+newColId
            }, 
            ...headerRow.cells.slice(m)
          ].map(c => {
            if(c.text.startsWith("pos.")) return { ...c, text: "pos. "+ n_pos++ }
            else return c
          })
        }

        const newEmptyData = { 
          ...emptyData, 
          position:[...emptyData.position, false] 
        }

        setOutlineData(
          applyChangesToOutlineData(
            createGlobalChange(outlineData, newData, +1, m, { 
              columns: newColumns, 
              headerRow: newHeaderRow, 
              emptyData: newEmptyData 
            }), 
            newData
          )
        )      
        // eslint-disable-next-line no-magic-numbers
        setTimeout(() => reactgridRef.current?.updateState(() => ({ selectedIds:[], selectedIndexes:[], selectedRanges:[] })), 10) 
      }
    })

    const posCols = selectedColIds.filter(c => c.startsWith("position"))

    if(posCols.length) menuOptions.push({
      id: "removeColumn",
      label: "Remove position column"+(posCols.length > 1?"s":""),
      handler: () => {     
        
        const minColPos = columns.findIndex(c => c.columnId === posCols[0]);
        const maxColPos = columns.findIndex(c => c.columnId === posCols[posCols.length-1]);
        const firstPos = columns.findIndex(c => c.columnId.startsWith("position"))
        
        const newData = outlineData.map(d => ({ 
          ...d, 
          position:[
            ...d.position.slice(0, minColPos-firstPos),
            ...d.position.slice(maxColPos-firstPos+1), 
          ] 
        }))
                
        const newEmptyData = { 
          ...emptyData, 
          position:[
            ...emptyData.position.slice(0, minColPos-firstPos),
            ...emptyData.position.slice(maxColPos-firstPos+1)
          ] 
        }
        
        //debug("ids:",posCols, minColPos, maxColPos, firstPos, newData, emptyData)   

        let n_pos = 1
        const newColumns = [
          ...columns.slice(0, minColPos), 
          ...columns.slice(maxColPos+1)
        ].map(c => {
          if(c.columnId.startsWith("position")) return { ...c, columnId:"position"+n_pos++ }
          else return c
        })

        n_pos = 1
        const newHeaderRow = { 
          ...headerRow,  
          cells:[
            ...headerRow.cells.slice(0, minColPos), 
            ...headerRow.cells.slice(maxColPos+1)
          ].map(c => {
            if(c.text.startsWith("pos.")) return { ...c, text: "pos. "+ n_pos++ }
            else return c
          })
        }

        setOutlineData(
          applyChangesToOutlineData(
            createGlobalChange(outlineData, newData, -(maxColPos-minColPos+1), minColPos, { 
              columns: newColumns, 
              headerRow: newHeaderRow, 
              emptyData: newEmptyData 
            }), 
            newData
          )
        )      
        
        // eslint-disable-next-line no-magic-numbers
        setTimeout(() => reactgridRef.current?.updateState(() => ({ selectedIds:[], selectedIndexes:[], selectedRanges:[] })), 10) 

      }
    })

    return menuOptions
  }, [applyChangesToOutlineData, columns, createGlobalChange, emptyData, headerRow, outlineData])

  const rowMenu = useCallback((
    selectedRowIds: Id[],
    selectedColIds: Id[],
    selectionMode: SelectionMode,
    menuOptions: MenuOption[]
  ): MenuOption[] => { 
    debug("opt:", menuOptions, errorData)        
        
    const pasteMenu = menuOptions.find(m => m.id === "paste");     
    
    const createPasteEventFromClipboard = async () => {
      let clipboardData = null;
      try{ clipboardData = new DataTransfer();} catch(e){ debug("data!",e)}
      const event = new ClipboardEvent("paste", { clipboardData }), clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if(type === "text/plain") {
            const text = await (await clipboardItem.getType(type)).text()
            event.clipboardData?.setData('text/plain', text);      
          }
        }
      }
      return event
    }

    pasteMenu.handler = async (...args) => {
      debug("paste!", args)
      const event = await createPasteEventFromClipboard()
      reactgridRef.current.eventHandlers.pasteHandler(event)
    }        

    menuOptions = [
      ...menuOptions, {
        id: "pasteNewRows",
        label: "Paste as new rows",
        handler:async  () => {
          debug("eD?", errorData)
          const m = Math.min(...selectedRowIds)
          const event = await createPasteEventFromClipboard()
          const text = event.clipboardData.getData("text/plain")
          const n = text.split("\n").filter(l => l).length
          addEmptyData(n, text, true, undefined, +n, m) 
        }
      }, {
        id: "insertRowBefore",
        label: "Insert row before",
        handler: () => {
          const m = Math.min(...selectedRowIds)
          const newData = [ 
            ...outlineData.slice(0, m), 
            { ...emptyData, position:[...emptyData.position] }, 
            ...outlineData.slice(m)
          ]
          setOutlineData(applyChangesToOutlineData(createGlobalChange(outlineData, newData, +1, m), newData))      
          // eslint-disable-next-line no-magic-numbers
          setTimeout(() => reactgridRef.current?.updateState(() => ({ selectedIds:[], selectedIndexes:[], selectedRanges:[] })), 10) 
        }
      }, {
        id: "insertRowAfter",
        label: "Insert row after",
        handler: () => {
          const m = Math.max(...selectedRowIds) + 1
          const newData = [ 
            ...outlineData.slice(0, m), 
            { ...emptyData, position:[...emptyData.position] }, 
            ...outlineData.slice(m)
          ]
          setOutlineData(applyChangesToOutlineData(createGlobalChange(outlineData, newData, +1, m), newData))      
          // eslint-disable-next-line no-magic-numbers
          setTimeout(() => reactgridRef.current?.updateState(() => ({ selectedIds:[], selectedIndexes:[], selectedRanges:[] })), 10) 
        }
      }, {
        id: "removeRow",
        label: "Remove row"+(selectedRowIds.length > 1 ? "s" :""),
        handler: () => { 
          const m = Math.min(...selectedRowIds)
          const newData = outlineData.filter((row,i) => !selectedRowIds.includes(i))
          setOutlineData(applyChangesToOutlineData(createGlobalChange(outlineData, newData, -selectedRowIds.length, m), newData))      
          // DONE: possible to deselect all after deleting
          // eslint-disable-next-line no-magic-numbers
          setTimeout(() => reactgridRef.current.updateState(() => ({ selectedIds:[], selectedIndexes:[], selectedRanges:[] })), 10) 
        }
      }
    ];    
    return menuOptions;
  },[errorData, addEmptyData, outlineData, emptyData, applyChangesToOutlineData, createGlobalChange])

  const simpleHandleContextMenu = useCallback((
    selectedRowIds: Id[],
    selectedColIds: Id[],
    selectionMode: SelectionMode,
    menuOptions: MenuOption[]
  ): MenuOption[] => { 
    if (selectionMode === "column") {
      return columnMenu(selectedRowIds, selectedColIds, selectionMode, menuOptions)
    } else if (selectionMode === "row") {
      return rowMenu(selectedRowIds, selectedColIds, selectionMode, menuOptions)
    }
    return menuOptions
  }, [columnMenu, rowMenu])

  const handleResSelectChange = useCallback((e) => { 
    debug("change:", e)
    const newVal = e.qname
    const changes = [{ 
      type:"text", 
      rowId: focusedLocation.row.rowId, 
      columnId: focusedLocation.column.columnId, 
      previousCell: { type: "text", text: focus },
      newCell: { type: "text", text: newVal },
      merged: false      
    }]
    //debug("change!", e.currentTarget?.value, focus, focusVal, changes)
    setOutlineData(applyChangesToOutlineData(changes, outlineData))
    setFocusVal(newVal)
    //document.querySelector(".iframe-BG").click()
  }, [focus, focusedLocation, outlineData])

  if(error && !errorCode) return <div>
      <p className="text-center text-muted">
        <NotFoundIcon className="icon mr-2" />
        {error}
      </p>
    </div>
  else if(!headerRow || ! outlineData.length || !columns.length) return <div>loading...</div>

  const rows = [
    headerRow,
    ...outlineData.map<Row>( (d,i) => ({
      rowId: i,
      height: rowHeight,
      cells: [{
          type: "text", text:d.RID          
        },
        ...d.position.map(p => ({
          type: "checkbox", checked: p,
        })),{
          type: "dropdown", 
          selectedValue:d.partType, 
          values: "T,S,V,C,E".split(",").map(v => ({ value:v, label: v })), // removed TOC
          isOpen: d.isTypeOpen
        },        
        ..."label,titles,work,notes,colophon,identifiers".split(",").map(p => ({
          type:"text", text: d[p], renderer: p !== "work" ? (text:string) => <span style={{ fontSize }}>{text}</span> : undefined,
          //className: p !== "work" ? "bo-text" : ""
          //renderer:(val) => <span title={"test"}>{val}</span>
        })),        
        ..."imgStart,imgEnd,imgGrpStart,imgGrpEnd".split(",").map(p => ({
          type:"number", value: Number(d[p]) || ""
        }))
      ]
    }))
  ]

  //debug("hi:", highlights, errorData)
  //debug("rerendering", focusedLocation, focus, reactgridRef.current?.state)
  debug("data:", outlineData, headerRow, columns, rows, emptyData) 

  return <>
    <div id="outline-fields" className="pl-3 pb-5 pt-0" style={{ textAlign: "left", display: "flex" }} >      
      <TextField
        select
        style={{ padding: "1px", width: "200px", flexShrink: 0 }}
        label={"Status"}
        value={status}
        InputLabelProps={{ shrink: true }}
        onChange={(e) => setStatus(e.target.value)}
      >
        { statusValues && Object.keys(statusValues).filter(k => ["StatusReleased","StatusWithdrawn","StatusEditing"].some(s => k.endsWith(s)))
            .map(s => // TODO: use locale
              <MenuItem key={s} value={s}>{statusValues[s][ns.SKOS("prefLabel").value].find(v => v.lang === "en")?.value}</MenuItem>
            )}
      </TextField>
      &nbsp;
      &nbsp;
      <TextField
        style={{ padding: "1px", width: "100%" }}
        label={"Attribution"}
        value={attrib}
        InputLabelProps={{ shrink: true }}
        onChange={(e) => setAttrib(e.target.value)}
      />
    </div>
    <div style={{ paddingBottom: "16px", paddingTop: "32px", outline: "none" }} onKeyDown={(e) => {
      if (!isMacOs() && e.ctrlKey || e.metaKey) {
        debug("sc:",e)
        switch (e.key) {
          case "z":
            handleUndoChanges();
            return;
          case "y":
            handleRedoChanges();
            return;
        }
      }
    }}>
    {
      <div id="focus" 
          disabled={focus === undefined || !focus.includes}
          className={(fullscreen ? "fs-true" : "") + (multiline  && focus.includes && focus.includes(";")? " multiline" : "")}>
      { focusedLocation?.column?.columnId === "work" ? <div style={{ border:"1px solid #bbb", padding: "6px", borderRadius: "5px", 
          background: "white", width:"calc(100% - 8px)", zIndex:1 }}>
        <ResourceSelector value={{ otherData: {}, uri:"tmp:uri", qname:"tmp:uri" }} editable={true} placeholder={focus}
          exists={() => false} subject={{ qname: "tmp:uri" }} title="Work" property={{ qname:"tmp:work", 
            expectedObjectTypes:[{ qname:"bdo:Work" }] }} onChange={handleResSelectChange} idx={0}
          />
      </div> : <>
        <TextField inputRef={topInputRef} multiline={multiline && focus.includes && focus.includes(";")} 
            value={focus === undefined || !focus.includes ? "" : multiline ? focus.split(/ *;+ */).join("\n") : focus} 
            variant="outlined" onChange={handleInputChange} 
            onBlur={handleInputBlur}
            inputProps={{ style: { padding:"0 10px", fontSize, height:48, lineHeight:48, 
            ...multiline && focus.includes && focus.includes(";")?{ 
              padding:0, height:(focus.split(/ *;+ */).length)*(fontSize*1.4)+"px", lineHeight: (fontSize*1.4)+"px" }:{} //eslint-disable-line
              } 
            }} 
        /> 
        <IconButton disabled={focus?.includes && !focus?.includes(";")} onClick={() => setMultiline(!multiline)}>
          { multiline ? <ExpandLessIcon/> : <ExpandMoreIcon /> }
        </IconButton>
      </> }
    </div>}
    <IconButton className={"btn-rouge fs-btn "+( fullscreen ? "fs-true" : "" )} onClick={() => setFullscreen(!fullscreen)} >
        { fullscreen 
          ? <FullscreenExitIcon />
          : <FullscreenIcon />
        }
    </IconButton>
    <div onPaste={handlePaste}  
        style={{ position: "relative", /*fontSize: fontSize + "px"*/ }}  className={"csv-container " + ( fullscreen ? "fullscreen" : "" )}        
      >
      <MyReactGrid 
        ref={reactgridRef} /*minColumnWidth={20}*/ enableRowSelection enableColumnSelection enableRangeSelection 
        onContextMenu={simpleHandleContextMenu} rows={rows} columns={columns} onCellsChanged={handleChanges} onColumnResized={handleColumnResize} 
        highlights={highlights.filter(h => !h.modified)}
        {...{ errorData, focusedLocation, setFocusedLocation, onEditing }}/>
    </div>
    <nav className="navbar bottom" style={{ left:0, zIndex:100000 }}>
      <div>
        <Button onClick={handleUndoChanges} 
          className="btn-blanc" disabled={cellChangesIndex < 0 /* || cellChangesIndex >= cellChanges.length*/ }
          >
          Undo
        </Button>      
        <Button onClick={handleRedoChanges} 
          className="btn-blanc ml-2" disabled={!cellChanges.length || cellChangesIndex === cellChanges.length - 1}
          >
          Redo
        </Button>      
      </div>
      <div id="sliders">
        <div>
          <span className="font-size">Font size</span>
          <Slider value={fontSize} onChange={(e, val) => setFontSize(val)} 
              aria-labelledby="continuous-slider" step={1} min={12} max={36}/>
        </div>
        <div>
          <span className="font-size">Row height</span>
          <Slider value={rowHeight} onChange={(e, val) => setRowHeight(val)} 
              aria-labelledby="continuous-slider" step={1} min={20} max={60}/>
        </div>
      </div>
      <div className="flex">
        <InstanceCSVSearch
          isFetching={isFetching}
          fetchErr={fetchErr}
          inNavBar={RID}
          resetCSV={() => setCsv("")}
          downloadCSV={handleDownloadCSV}
          disabled={popupOn}
        />
        <Button onClick={popupOn?save:() => setPopupOn(true)} className="btn-rouge" disabled={!outlineData.length || saving || popupOn && !message} 
            {...!popupOn?{ style:{ marginLeft: "1em" } }:{}}
            >{
          saving 
          ? <CircularProgress size="14px" color="white" />
          : <>Save</>
        }</Button>      
        {popupOn && (
          <Button
              variant="outlined"
              onClick={resetPopup}
              className="btn-blanc ml-2"
              disabled={saving}
              //style={{ position: "absolute", left: "calc(100% - (100% - 1225px)/2)" }}
              >
              Cancel
            </Button>
          )}
      </div>
      <div className={"popup " + (popupOn ? "on " : "") + (error ? "error " : "")} 
        style={{ marginTop:(popupOn&&Array.isArray(error)?-(error.length - 2)*14:0)+"px" /* eslint-disable-line */ }}> 
        <div>
          <TextField
            label={"commit message"}
            value={message}
            onChange={(ev) => setMessage(ev.target.value)}
            InputLabelProps={{ shrink: true }}
            style={{ minWidth: 300 }}
            {...(error
              ? {
                  helperText: (
                    <span style={{ display: "flex", alignItems: "center" }}>
                      <ErrorIcon style={{ fontSize: "20px" }} />
                      <i style={{ paddingLeft: "5px", lineHeight: "14px", display: "inline-block" }}>{error}</i>
                      &nbsp;&nbsp;
                      {errorCode === wrongEtagCode && (
                        <Button className="btn-blanc" onClick={handleReload}>
                          {i18n.t("general.reload")}
                        </Button>
                      )}
                      {curl && (
                        <Button
                          className="btn-blanc"
                          onClick={() => {
                            navigator.clipboard.writeText(curl)
                          }}
                        >
                          copy trace
                        </Button>
                      )}
                    </span>
                  ),
                  error: true,
                }
              : {})}
          />

          <TextField
            select
            value={lang}
            onChange={(ev) => setLang(ev.target.value)}
            InputLabelProps={{ shrink: true }}
            style={{ minWidth: 100, marginTop: "16px", marginLeft: "15px", marginRight: "15px" }}
          >
            {langs.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.value}
              </MenuItem>
            ))}
          </TextField>
        </div>      
      </div>
    </nav>
  </div>
</>
}