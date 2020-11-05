/* eslint-disable react/jsx-key */

import React from "react"
import { useTable, usePagination, useExpanded } from "react-table"
import MaUTable from "@material-ui/core/Table"
import { TableBody, TableCell, TableHead, TableRow, TablePagination } from "@material-ui/core"

function DataGrid({ columns, data, hiddenColumns = [] }) {
  const initialState = {
    hiddenColumns,
  }
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    // rows,
    prepareRow,
    page, // Instead of using 'rows', we'll use page,
    // which has only the rows for the active page
    // visibleColumns,
    // The rest of these things are super handy, too ;)
    gotoPage,
    state: { pageIndex, pageSize },
  } = useTable({ columns, data, initialState }, useExpanded, usePagination)

  return (
    <React.Fragment>
      <MaUTable {...getTableProps()} className="table-mui-style">
        <TableHead>
          {headerGroups.map((headerGroup) => (
            <TableRow {...headerGroup.getHeaderGroupProps()} className="text-uppercase">
              {headerGroup.headers.map((column) => (
                <TableCell {...column.getHeaderProps()}>{column.render("Header")}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row)
            return (
              <React.Fragment key={`multi-${i}`}>
                <TableRow {...row.getRowProps()}>
                  {row.cells.map((cell) => {
                    return <TableCell {...cell.getCellProps()}>{cell.render("Cell")}</TableCell>
                  })}
                </TableRow>
              </React.Fragment>
            )
          })}
        </TableBody>
      </MaUTable>

      <TablePagination
        className="table-mui-style-pagination"
        component="div"
        count={data.length}
        page={pageIndex}
        onChangePage={(event, pageNumber) => gotoPage(pageNumber)}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[]}
      />
    </React.Fragment>
  )
}

export default DataGrid
