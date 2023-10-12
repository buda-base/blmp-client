import React, { useEffect, useState } from "react"
import { useRecoilState } from "recoil"
import Papa from 'papaparse';
import { ReactGrid, Column, Row } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import IconButton from '@material-ui/core/IconButton';

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

// eslint-disable-next-line no-magic-numbers
const colWidths = { "RID":150, "Position": 20, "part type":90, "img start": 75, "img end": 75, "volume start":75, "volume end":75 }

const colLabels = {  "img start":"im. start", "img end": "im. end", "volume start":"vol. start", "volume end": "vol. end" }

export default function OutlineCSVEditor(props) {
  const { RID } = props
  const [tab, setTab] = useRecoilState(uiTabState)
  const [csv, setCsv] = useState("")
  const [outlineData, setOutlineData] = useState<OutlineEntry[]>([])
  const [headerRow, setHeaderRow] = useState<Row>()
  const [columns, setColumns] = useState<Column[]>([]);
  
  const handleColumnResize = (ci: Id, width: number) => {
      setColumns((prevColumns) => {
          const columnIndex = prevColumns.findIndex(el => el.columnId === ci);
          const resizedColumn = prevColumns[columnIndex];
          const updatedColumn = { ...resizedColumn, width };
          prevColumns[columnIndex] = updatedColumn;
          return [...prevColumns];
      });
  }

  const applyChangesToOutlineData = (
    changes: CellChange[],
    prevEntry: OutlineEntry[]
  ): OutlineEntry[] => {
    changes.forEach((change) => {
      const entryIndex = change.rowId;
      const fieldName = change.columnId;
      if (change.type === 'checkbox') {
        const numChecked = prevEntry[entryIndex].position.reduce((acc,e) => acc + (e ? 1 : 0), 0)
        const n_pos = Number(fieldName.replace(/^[^0-9]+/g,""))
        //debug("nC:", n_pos, numChecked, prevEntry[entryIndex])        
        if(numChecked !== 1 || change.newCell.checked) { 
          prevEntry[entryIndex].position[n_pos - 1] = change.newCell.checked;
          if(change.newCell.checked) {
            for(const i in prevEntry[entryIndex].position) {              
              if(Number(i) !== Number(n_pos - 1)) prevEntry[entryIndex].position[i] = false 
            }
          }
        }
      } else if (change.type === 'text') {
        prevEntry[entryIndex][fieldName] = change.newCell.text;
      } else if (change.type === 'dropdown') {
        //debug("dd:", change, fieldName)
        prevEntry[entryIndex].isTypeOpen = change.newCell.isOpen;
        prevEntry[entryIndex][fieldName] = change.newCell.value;
      }
    });
    return [...prevEntry];
  };

  const handleChanges = (changes: CellChange<TextCell>[]) => { 
    setOutlineData((prevEntry) => applyChangesToOutlineData(changes, prevEntry)); 
  }; 

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
            
            setOutlineData(data)

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

  const [fullscreen, setFullscreen] = useState(false)

  if(!headerRow || ! outlineData.length || !columns.length) return <div>loading...</div>

  const rows = [
    headerRow,
    ...outlineData.map<Row>( (d,i) => ({
      rowId: i,
      cells: [{
          type: "text", text:d.RID
        },
        ...d.position.map(p => ({
          type: "checkbox", checked: p
        })),{
          type: "dropdown", selectedValue:d.partType, values: "T,S,V,C,E,TOC".split(",").map(v => ({ value:v, label: v })),
          isOpen: d.isTypeOpen
        },        
        ..."label,titles,work,notes,colophon".split(",").map(p => ({
          type:"text", text: d[p]
        })),        
        ..."imgStart,imgEnd,volumeStart,volumeEnd".split(",").map(p => ({
          type:"number", value: Number(d[p]) || ""
        }))
      ]
    }))
  ]

  //debug("data:", outlineData, headerRow, columns, rows, colWidths, colWidths["Position"])
  
  return <div style={{ paddingBottom: "16px" }}>
    <IconButton className={"btn-rouge fs-btn "+( fullscreen ? "fs-true" : "" )} onClick={() => setFullscreen(!fullscreen)} >
        { fullscreen 
          ? <FullscreenExitIcon />
          : <FullscreenIcon />
        }
    </IconButton>
    <div style={{ position: "relative" }}  className={"csv-container " + ( fullscreen ? "fullscreen" : "" )}>
      
      <ReactGrid rows={rows} columns={columns} onCellsChanged={handleChanges} onColumnResized={handleColumnResize} />
    </div>
  </div>
}
