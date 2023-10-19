import React, { useEffect, useState, useRef, useCallback } from "react"
import { useRecoilState } from "recoil"
import Papa from 'papaparse';
import { ReactGrid, Column, Row, Id, MenuOption, SelectionMode, EventHandlers, pasteData } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Slider from '@material-ui/core/Slider';

import { uiTabState } from "../atoms/common"
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

let styleSheet, globalHeaderRow

const myHandlePaste = (event: ClipboardEvent, state: State): State => {
  const activeSelectedRange = state.selectedRanges[state.activeSelectedRangeIdx]
  if (!activeSelectedRange) {
    return state;
  }
  let pastedRows: Compatible<Cell>[][] = [];
  pastedRows = event.clipboardData
    .getData("text/plain")
    .split("\n")
    .map(line => {
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
    })
    .map((line: string) =>
      line
        .split("\t")
        .map((t) => ({ type: "text", text: t, value: parseFloat(t) }))
    );
  event.preventDefault();
  return { ...pasteData(state, pastedRows) };
}

class MyEventHandlers extends EventHandlers {
  copyHandler = (event: ClipboardEvent): void => { 
    debug("ctrl-c:", event)    
    this.updateState(state => state.currentBehavior.handleCopy(event, state));
  }
  pasteHandler = async (event: ClipboardEvent): void => { 
    debug("ctrl-v:", event)
    this.updateState(state => myHandlePaste(event, state)) //estate.currentBehavior.handlePaste(event, state));    
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

  const reactgridRef = useRef<MyReactGrid>(null)

  debug("ref:", reactgridRef, outlineData, headerRow)

  const handleColumnResize = (ci: Id, width: number) => {
      setColumns((prevColumns) => {
          const columnIndex = prevColumns.findIndex(el => el.columnId === ci);
          const resizedColumn = prevColumns[columnIndex];
          const updatedColumn = { ...resizedColumn, width };
          prevColumns[columnIndex] = updatedColumn;
          return [...prevColumns];
      });
  }
  const simpleHandleContextMenu = useCallback((
      selectedRowIds: Id[],
      selectedColIds: Id[],
      selectionMode: SelectionMode,
      menuOptions: MenuOption[]
    ): MenuOption[] => { 
      if (selectionMode === "row") {
        debug("opt:", menuOptions)        
        const pasteMenu = menuOptions.find(m => m.id === "paste");        
        const pasteFunc = pasteMenu.handler
        pasteMenu.handler = async (...args) => {
          //e.persist()
          debug("paste!", args)
          
          //pasteFunc(...args) // waiting for https://github.com/silevis/reactgrid/issues/250 to be fixed... using ctrl-v function instead

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

          reactgridRef.current.eventHandlers.pasteHandler(event)
        }        

        menuOptions = [
          ...menuOptions, {
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
  }, [outlineData, emptyData])

  const applyChangesToOutlineData = (
    changes: CellChange[],
    prevEntry: OutlineEntry[]
  ): OutlineEntry[] => {
    //debug(changes)
        
    changes.forEach((change, n) => {      
      const entryIndex = change.rowId;
      const fieldName = change.columnId;
      
      // more than 1 change ==> copy/paste + don't paste RID in first column
      if(changes.length > 1 && fieldName === "RID") return

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
          const resp = await fetch(config.API_BASEURL + "outline/csv/" + RID)
          const text = await resp.text()
          setCsv(text)
          Papa.parse(text, { worker: true, delimiter:",", complete: (results) => {

            let n_pos = 1
            const head = {
              rowId: "header",
              height: rowHeight,
              cells: results.data[0].map( d => ({ type: "header", text: d === "Position" ? "pos. " + n_pos++ : colLabels[d] || d }))
            }
            setHeaderRow(head)

            const data = results.data.map((d,i) => {
              if(i>0) { 
                const position = []
                head.cells.map( (c,j) => {
                  if(c.text.startsWith("pos.")) position.push(d[j] === "X")
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
            }).filter(d => d && d.RID)

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
  }, [RID, csv])

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
    globalHeaderRow = headerRow
  }

  const [fullscreen, setFullscreen] = useState(false)

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

  //debug("rerendering")
  //debug("data:", outlineData, headerRow, columns, rows, colWidths, colWidths["Position"])    

  return <div style={{ paddingBottom: "16px" }}>
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
        rows={rows} columns={columns} onCellsChanged={handleChanges} onColumnResized={handleColumnResize} />
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
      <Button className="btn-rouge" disabled>Save</Button>      
    </nav>
  </div>
}
