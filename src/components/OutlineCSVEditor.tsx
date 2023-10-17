import React, { useEffect, useState, useRef, useCallback } from "react"
import { useRecoilState } from "recoil"
import Papa from 'papaparse';
import { ReactGrid, Column, Row, Id, MenuOption, SelectionMode } from "@silevis/reactgrid";
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

let styleSheet

export default function OutlineCSVEditor(props) {
  const { RID } = props
  const [tab, setTab] = useRecoilState(uiTabState)
  const [csv, setCsv] = useState("")
  const [outlineData, setOutlineData] = useState<OutlineEntry[]>([])
  const [emptyData, setEmptyData] = useState<OutlineEntry>()
  const [headerRow, setHeaderRow] = useState<Row>()
  const [columns, setColumns] = useState<Column[]>([]);
  
  const reactgridRef = useRef<ReactGrid>(null)

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
    changes.map(c => debug(c))
    
    // more than 1 change ==> copy/paste
    if(changes.length > 1) {
      if(changes[0].columnId === "RID" && changes[0].newCell.text) changes.shift() // dont paste the RID
    }

    changes.forEach((change) => {
      const entryIndex = change.rowId;
      const fieldName = change.columnId;
      if (change.type === 'checkbox') {
        const numChecked = prevEntry[entryIndex].position.reduce((acc,e) => acc + (e ? 1 : 0), 0)
        const n_pos = Number(fieldName.replace(/^[^0-9]+/g,""))
        //debug("nC:", n_pos, numChecked, prevEntry[entryIndex])        
        if(numChecked !== 1 || change.newCell.checked || changes.length > 1 && !changes[0].newCell.text) { 
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

  /*
  useEffect(() => {

  }, [outlineData])
  */

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
    <div style={{ position: "relative", /*fontSize: fontSize + "px"*/ }}  className={"csv-container " + ( fullscreen ? "fullscreen" : "" )}>
      
      <ReactGrid ref={reactgridRef} /*minColumnWidth={20}*/ enableRowSelection enableRangeSelection onContextMenu={simpleHandleContextMenu}
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
