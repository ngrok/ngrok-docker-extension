import { useState } from "react";
import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { NgrokContainer, useNgrokContext } from "../NgrokContext";

interface AuthSelectProps {
    container: NgrokContainer;
}

export default function OAuthSelect({ ...props }: AuthSelectProps) {
  
  const { containers, setContainers, setEndpoints } = useNgrokContext();

  const toggleOAuth = (event: SelectChangeEvent<HTMLInputElement>) => {
    console.log("toggle oAuth", event.target.value);
    props.container.oauth = event.target.value as string;
    setContainers({...containers, [props.container.id]:props.container});
  }

  return (<Select
    labelId="demo-simple-select-label"
    id="demo-simple-select"
    value={props.container.oauth as ""}
    displayEmpty
    label="oAuth Provider"
    onChange={toggleOAuth}
  >
    <MenuItem value=''>Off</MenuItem>
    <MenuItem value='google'>Google</MenuItem>
    <MenuItem value='facebook'>Facebook</MenuItem>
  </Select>);
}