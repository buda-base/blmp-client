import React, { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo } from "react"
import { useRecoilState } from "recoil"
import Papa from 'papaparse';
import { ReactGrid, Column, Row, Id, MenuOption, SelectionMode, EventHandlers, pasteData } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Slider from '@material-ui/core/Slider';
import TextField from '@material-ui/core/TextField';

import { uiTabState, localCSVAtom } from "../atoms/common"
import config from "../config"

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
  imgStart:number,
  imgEnd:number,
  volumeStart:number,
  volumeEnd:number
}

const colWidths = { 
  "RID":40, "Position": 40, "part type":90, 
  "label":250, "titles":500, "work": 250, "colophon": 500,
  "img start": 75, "img end": 75, "volume start":75, "volume end":75 
}

const colLabels = {  "img start":"im. start", "img end": "im. end", "volume start":"vol. start", "volume end": "vol. end" }

const parts = "T,S,V,C,E,TOC".split(",")

let styleSheet, globalHeaderRow, mayAddEmptyData

const patchLine = (line:string) => {
  let patched = line.split(/\t/)
  const numPosFrom = patched.findIndex(p => parts.includes(p)) - 1
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
    const n = text.split("\n").length
    mayAddEmptyData(n, text, false, event)
    event.preventDefault();
  }
  cutHandler = (event: ClipboardEvent): void => { 
    debug("ctrl-x:", event)
    this.updateState(state => state.currentBehavior.handleCut(event, state));
  }
}

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
  }
}

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
      RID:d[0], position, partType:d[idx], label:d[idx+1], titles:d[idx+2], work:d[idx+3], notes:d[idx+4], colophon:d[idx+5], 
      //eslint-disable-next-line no-magic-numbers
      imgStart:Number(d[idx+6]), imgEnd:Number(d[idx+7]), volumeStart:Number(d[idx+8]), volumeEnd:Number(d[idx+9]),
      
      isTypeOpen: false
    }
  }

  const addEmptyData = useCallback((numRows:number, text:string, insert = false, event?: ClipboardEvent) => {
    const firstRowIdx = reactgridRef.current.state.selectedRanges[0].first.row.rowId
    const numFrom = outlineData.length
    const numTo = (insert ? numFrom : firstRowIdx) + numRows
    debug("oD:", numFrom, numTo, event, reactgridRef.current.state)
    // keep default behavior if not pasting full line (first cell of row)
    if(!text.includes("\t")
        || event && reactgridRef.current.state.selectedRanges.length && reactgridRef.current.state.selectedRanges[0].first.column.idx !== 0 
      ) {
      reactgridRef.current.updateState(state => state.currentBehavior.handlePaste(event, state)) 
      return
    }
    if(numTo > numFrom) {
      let newData = insert ? [ ...outlineData.slice(0, firstRowIdx) ] : [ ...outlineData ]
      for(let i = 0 ; i < numTo - numFrom ; i++) newData.push({ ...emptyData, position:[...emptyData.position] })
      if(insert) newData = newData.concat([ ...outlineData.slice(firstRowIdx) ])
      // now rewrite data using clipboard
      const pasted = text.split("\n")
      for(let i = 0 ; i < pasted.length ; i++) {
        const rowIdx = reactgridRef.current.state.selectedRanges[0].first.row.rowId
        newData[rowIdx + i] = makeRow([newData[rowIdx + i].RID].concat(patchLine(pasted[i]).split("\t").slice(1)), headerRow, true)
      }
      setOutlineData(newData)                  
    } else {
      reactgridRef.current.updateState(state => myHandlePaste(text, state)) 
    } 
  }, [outlineData, emptyData, headerRow])
  mayAddEmptyData = addEmptyData

  const simpleHandleContextMenu = useCallback((
      selectedRowIds: Id[],
      selectedColIds: Id[],
      selectionMode: SelectionMode,
      menuOptions: MenuOption[]
    ): MenuOption[] => { 
      if (selectionMode === "row") {
        debug("opt:", menuOptions)        
        
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
              const event = await createPasteEventFromClipboard()
              const text = event.clipboardData.getData("text/plain")
              const n = text.split("\n").length
              addEmptyData(n, text, true) 
            }
          }, {
            id: "insertRowBefore",
            label: "Insert row before",
            handler: () => {
              const newData = [ 
                ...outlineData.slice(0, Math.min(...selectedRowIds)), 
                { ...emptyData }, 
                ...outlineData.slice(Math.min(...selectedRowIds))
              ]
              setOutlineData(newData)
              // eslint-disable-next-line no-magic-numbers
              setTimeout(() => reactgridRef.current?.updateState(() => ({ selectedIds:[], selectedIndexes:[], selectedRanges:[] })), 10) 
            }
          }, {
            id: "insertRowAfter",
            label: "Insert row after",
            handler: () => {
              const newData = [ 
                ...outlineData.slice(0, Math.max(...selectedRowIds) + 1), 
                { ...emptyData }, 
                ...outlineData.slice(Math.max(...selectedRowIds) + 1)
              ]
              setOutlineData(newData)
              // eslint-disable-next-line no-magic-numbers
              setTimeout(() => reactgridRef.current?.updateState(() => ({ selectedIds:[], selectedIndexes:[], selectedRanges:[] })), 10) 
            }
          }, {
            id: "removeRow",
            label: "Remove row"+(selectedRowIds.length > 1 ? "s" :""),
            handler: () => { 
              setOutlineData(outlineData.filter((row,i) => !selectedRowIds.includes(i)))
              // DONE: possible to deselect all after deleting
              // eslint-disable-next-line no-magic-numbers
              setTimeout(() => reactgridRef.current.updateState(() => ({ selectedIds:[], selectedIndexes:[], selectedRanges:[] })), 10) 
            }
          }
        ];
      }
      return menuOptions;
  }, [outlineData, emptyData, addEmptyData])

  const applyChangesToOutlineData = (
    changes: CellChange[],
    prevEntry: OutlineEntry[]
  ): OutlineEntry[] => {
    
    debug("changes:",changes)

    changes.forEach((change, n) => {      
      const entryIndex = change.rowId;
      const fieldName = change.columnId;
      
      // more than 2 change (duplicate when editing RID in a loaded csv) ==> copy/paste = don't paste RID in first column
      if(changes.length > 2 && fieldName === "RID") { // eslint-disable-line
        debug("changes:RID")
        return
      }

      if (change.type === 'checkbox') {
        const numChecked = prevEntry[entryIndex].position.reduce((acc,e) => acc + (e ? 1 : 0), 0)
        const n_pos = Number(fieldName.replace(/^[^0-9]+/g,""))
        //debug("nC:", n_pos, numChecked, prevEntry[entryIndex])        
        if(numChecked !== 1 || change.newCell.checked || changes.length > 1) { // && !changes[0].newCell.text) { 
          prevEntry[entryIndex].position[n_pos - 1] = change.newCell.checked;
          if(change.newCell.checked) {
            for(const i in prevEntry[entryIndex].position) {              
              if(Number(i) !== Number(n_pos - 1)) prevEntry[entryIndex].position[i] = false 
            }
          }
        }
      } else if (change.type === 'text') {
        prevEntry[entryIndex][fieldName] = change.newCell.text;
      } else if (change.type === 'number') {
        debug("num:", change, fieldName)
        if(change.newCell.value !== "" && !isNaN(change.newCell.value)) { 
          let v = change.newCell.value
          if(v < 1) v = 1
          if(v > 2000) v = 2000 // eslint-disable-line no-magic-numbers
          prevEntry[entryIndex][fieldName] = v;
        }
        else if(change.newCell.text === '') prevEntry[entryIndex][fieldName] = '';
      } else if (change.type === 'dropdown') {
        debug("dd:", change, fieldName)
        prevEntry[entryIndex].isTypeOpen = change.newCell.isOpen
        if(change.newCell.selectedValue && change.newCell.selectedValue !== change.previousCell.selectedValue)       
          prevEntry[entryIndex][fieldName] = change.newCell.selectedValue
      }
    });
    return [...prevEntry];
  };

  const handleChanges = (changes: CellChange<TextCell>[]) => { 
    setOutlineData((prevEntry) => applyChangesToOutlineData(changes, prevEntry)); 
  }; 

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

  useEffect(() => {

    const fetchCsv = async () => {
      if (RID && !csv) {
        setCsv(true)
        try {
          let text
          if(!localCSV) {
            const resp = await fetch(config.API_BASEURL + "outline/csv/" + RID)
            text = await resp.text()
          } else {
            text = localCSV
          }
          if(text) text = text.replace(/\n$/m,"")

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
              RID:"", position, partType:"T", label:"", titles:"", work:"", notes:"", colophon:"", imgStart:"", imgEnd:"", 
              volumeStart:"", volumeEnd:"",             
              isTypeOpen: false
            }
            setEmptyData(empty)

            if(!data?.length) { 
              setOutlineData([empty])
            }
            else {
              setOutlineData(data)
            }

            n_pos = 0
            setColumns(head.cells.map( ({ text }, i) => { 
              debug("w:", text, i, colWidths)
              return { 
              columnId: results.data[0][i].replace(/ (.)/,(m,g1) => g1.toUpperCase()).replace(/Position/,"position" + n_pos++),
              resizable:true,
              width: colWidths[results.data[0][i]] || 150 // eslint-disable-line no-magic-numbers
            }}) || []) 
          } } )
        } catch(e) {
          // TODO: error fetching csv (401/403)
        }
      }
    }
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

  const focus = useMemo(() => 
    focusedLocation?.row && focusedLocation?.column && outlineData?.length > focusedLocation.row.rowId 
      && !["RID", "work"].includes(focusedLocation?.column?.columnId)
        ? outlineData[focusedLocation.row.rowId][focusedLocation.column.columnId] 
        : undefined, 
    [focusedLocation, outlineData]
  )

  const [saving, setSaving] = useState(false)

  const rowToCsv = useCallback((o) => {
    debug("o:",o,columns)
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

  const save = useCallback(async () => {
    
    setSaving(false)

    const idToken = localStorage.getItem("BLMPidToken")

    const headers = new Headers()
    headers.set("Content-Type", "text/csv")
    headers.set("Authorization", "Bearer " + idToken)
    //if (message) headers.set("X-Change-Message", encodeURIComponent(message))
    //if (previousEtag) headers.set("If-Match", previousEtag)

    const method = "PUT"

    const body = headerRow.cells.map(c => '"'+c.text.replace(/pos\..*/, "Position").replace(/im./,"img").replace(/vol./,"volume")+'"').join(",")
              + "\n" + outlineData.map(rowToCsv).join("\n")+"\n"
    debug("body:", body)

    const url = config.API_BASEURL + "outline/csv/" + RID
    
    const response = await fetch(url, { headers, method, body  })
    
    setSaving(true)

    try {
      await fetch("https://ldspdi.bdrc.io/clearcache", { method: "POST" })
    } catch(e) {
      setMessage("error when clearing cache")  
    }
        
  }, [outlineData, headerRow, columns])
   
  if(!headerRow || ! outlineData.length || !columns.length) return <div>loading...</div>

  const rows = [
    headerRow,
    ...outlineData.map<Row>( (d,i) => ({
      rowId: i,
      height: rowHeight,
      cells: [{
          type: "text", text:d.RID          
        },
        ...d.position.map(p => ({
          type: "checkbox", checked: p
        })),{
          type: "dropdown", 
          selectedValue:d.partType, 
          values: "T,S,V,C,E,TOC".split(",").map(v => ({ value:v, label: v })),
          isOpen: d.isTypeOpen
        },        
        ..."label,titles,work,notes,colophon".split(",").map(p => ({
          type:"text", text: d[p], renderer: p !== "work" ? (text:string) => <span style={{ fontSize }}>{text}</span> : undefined
          //className: p !== "work" ? "bo-text" : ""
        })),        
        ..."imgStart,imgEnd,volumeStart,volumeEnd".split(",").map(p => ({
          type:"number", value: Number(d[p]) || ""
        }))
      ]
    }))
  ]

  debug("rerendering", focusedLocation, focus)
  debug("data:", outlineData, headerRow, columns, rows, colWidths, colWidths["Position"])    

  return <div style={{ paddingBottom: "16px", paddingTop: "32px" }}>
    {focus !== undefined && focus.includes && <div id="focus" 
        className={(fullscreen ? "fs-true" : "") + (multiline  && focus.includes && focus.includes(";")? " multiline" : "")}>
      <TextField multiline={multiline && focus.includes && focus.includes(";")} value={multiline ? focus.split(/ *;+ */).join("\n") : focus} 
          variant="outlined" inputProps={{ style: { padding:"0 10px", fontSize, height:48, lineHeight:48, 
            ...multiline && focus.includes && focus.includes(";")?{ padding:0, height:(focus.split(/ *;+ */).length)*(fontSize*1.4)+"px", lineHeight: (fontSize*1.4)+"px" }:{} //eslint-disable-line
          } }} 
      /> 
      <IconButton disabled={focus.includes && !focus.includes(";")} onClick={() => setMultiline(!multiline)}>
        { multiline ? <ExpandLessIcon/> : <ExpandMoreIcon /> }
      </IconButton>
    </div>}
    <IconButton className={"btn-rouge fs-btn "+( fullscreen ? "fs-true" : "" )} onClick={() => setFullscreen(!fullscreen)} >
        { fullscreen 
          ? <FullscreenExitIcon />
          : <FullscreenIcon />
        }
    </IconButton>
    <div onPaste={handlePaste}  
        style={{ position: "relative", /*fontSize: fontSize + "px"*/ }}  className={"csv-container " + ( fullscreen ? "fullscreen" : "" )}>      
      <MyReactGrid 
        ref={reactgridRef} /*minColumnWidth={20}*/ enableRowSelection enableRangeSelection onContextMenu={simpleHandleContextMenu}
        rows={rows} columns={columns} onCellsChanged={handleChanges} onColumnResized={handleColumnResize} 
        {...{ focusedLocation, setFocusedLocation }}/>
    </div>
    <nav className="navbar bottom" style={{ left:0, zIndex:100000 }}>
      <div></div>
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
      <Button onClick={save} className="btn-rouge" disabled={!outlineData.length && !saving}>Save</Button>      
    </nav>
  </div>
}
