import React, { useEffect, useState } from "react"
import { useRecoilState } from "recoil"
import Papa from 'papaparse';
import { ReactGrid, Column, Row } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";

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
const colWidths = [ 335, 20, 20, 20, 20 ]

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
              cells: results.data[0].map( d => ({ type: "header", text: d === "Position" ? "pos. " + n_pos++:d })).slice(0,1+1+1+1+1)
            }
            setHeaderRow(head)

            const data = results.data.map((d,i) => {
              if(i>0) { 
                const position = []
                head.cells.map( (c,j) => {
                  if(c.text.startsWith("pos.")) position.push(d[j] === "X")
                });
                return {
                  //eslint-disable-next-line no-magic-numbers
                  RID:d[0], position, partType:d[5], label:d[6], titles:d[7], work:d[8], notes:d[9], colophon:d[10], imgStart:Number(d[11]), 
                  //eslint-disable-next-line no-magic-numbers
                  imgEnd:Number(d[12]), volumeStart:Number(d[13]), volumeEnd:Number(d[14])
                }
              }
            }).filter(d => d && d.RID)
            
            setOutlineData(data)

            n_pos = 0
            setColumns(head.cells.map( ({ text }, i) => ({ 
              columnId: results.data[0][i].replace(/ (.)/,(m,g1) => g1.toUpperCase()).replace(/Position/,"position" + n_pos++),
              resizable:true,
              width: colWidths[i] // eslint-disable-line no-magic-numbers
            })).slice(0,1+1+1+1+1) || [])

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

  if(!headerRow || ! outlineData.length || !columns.length) return <div>no data yet</div>

  const rows = [
    headerRow,
    ...outlineData.map<Row>( (d,i) => ({
      rowId: i,
      cells: [{
        type: "text", text:d.RID
        },
        ...d.position.map(p => ({
          type: "checkbox", checked: p
        }))
      ]
        /*,
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
        */

    }))
  ]

  debug("data:", outlineData, headerRow, columns, rows)
  
  return <ReactGrid rows={rows} columns={columns} onCellsChanged={handleChanges} onColumnResized={handleColumnResize} />;
}
