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
  position1:boolean,
  position2:boolean,
  position3:boolean,
  position4:boolean,
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

export default function OutlineCSVEditor(props) {
  const { RID } = props
  const [tab, setTab] = useRecoilState(uiTabState)
  const [csv, setCsv] = useState("")
  const [outlineData, setOutlineData] = useState<OutlineEntry[]>([])
  const [headerRow, setHeaderRow] = useState<Row>()

  const applyChangesToOutlineData = (
    changes: CellChange[],
    prevEntry: OutlineEntry[]
  ): OutlineEntry[] => {
    changes.forEach((change) => {
      const entryIndex = change.rowId;
      const fieldName = change.columnId;
      if (change.type === 'checkbox') {
        prevEntry[entryIndex][fieldName] = change.newCell.checked;
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
            const data = results.data.map((d,i) => {
              if(i>0) return {
                //eslint-disable-next-line no-magic-numbers
                RID:d[0], position1:d[1]==="X", position2:d[2]==="X", position3:d[3]==="X", position4:d[4]==="X", partType:d[5], label:d[6], 
                //eslint-disable-next-line no-magic-numbers
                titles:d[7], work:d[8], notes:d[9], colophon:d[10], imgStart:Number(d[11]), imgEnd:Number(d[12]), volumeStart:Number(d[13]), 
                //eslint-disable-next-line no-magic-numbers
                volumeEnd:Number(d[14])
              }
            }).filter(d => d && d.RID)
                        
            setHeaderRow({
              rowId: "header",
              cells: results.data[0].map( d => ({ type: "header", text: d })).slice(0,1+1)
            })

            setOutlineData(data)

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

  if(!headerRow || ! outlineData.length) return <div>no data yet</div>

  let n_pos = 0
  const columns = headerRow?.cells.map( ({ text }) => ({ 
    columnId: text.replace(/ (.)/,(m,g1) => g1.toUpperCase()).replace(/Position/,"position" + n_pos++),
    resizable:true,
    //width: d === "Position" ? "20px" : "150px"
  } )).slice(0,1+1) || []

  const rows = [
    headerRow,
    ...outlineData.map<Row>( (d,i) => ({
      rowId: i,
      cells: [{
        type: "text", text:d.RID
      },{
        type: "checkbox", checked: d.position1 
      }]
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
  
  return <ReactGrid rows={rows} columns={columns} onCellsChanged={handleChanges}/>;
}
