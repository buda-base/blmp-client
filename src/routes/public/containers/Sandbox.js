import React from "react";
import TodoListOriginal from "../components/TodoList";
import TodoListLazy from "../components/TodoListLazy";
import ExpandMore from '@material-ui/icons/ExpandMore';
import { AddIcon } from "../../layout/icons"

function Sandbox(props) {
  return (
    <div role="main">
      <p className="small text-muted text-center my-4">
        DEPRECATED: INSERT ON<AddIcon className="icon mr-1"/><ExpandMore />
      </p>
      <div className="card col-md-4 px-2 py-2 my-4 mx-auto">
        <TodoListOriginal id={"sandbox"}/>
      </div>

      <p className="small text-muted text-center">WITH EXISTING DATA<ExpandMore /></p>
      <div className="card col-md-4 px-2 py-2 my-4 mx-auto">
        <TodoListLazy id={"sandbox3"} initialState={[
          {
            "@value": "restless resonance",
            "@language": "en"
          }]}/>
      </div>

      <p className="small text-muted text-center">WITHOUT DATA<ExpandMore /></p>
      <div className="card col-md-4 px-2 py-2 my-4 mx-auto">
        <TodoListLazy id={"sandbox4a"} />
      </div>

      <p className="small text-muted text-center">WITHOUT DATA FULL-WIDTH<ExpandMore /></p>
      <div className="card col-md-4 px-2 py-2 my-4 mx-auto">
        <TodoListLazy id={"sandbox4b"} fullWidth/>
      </div>

      <p className="small text-muted text-center">PRE-INITIALIZED BLANK<ExpandMore /></p>
      <div className="card col-md-4 px-2 py-2 mx-auto">
        <TodoListLazy id={"sandbox5"} initialState={[{}]}/>
      </div>
    </div>
  )
}

export default Sandbox
