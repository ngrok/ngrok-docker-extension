import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import Button from "@mui/material/Button";
import React, { useState } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNgrokContext } from "./NgrokContext";

export default function SettingsDialog() {
  const { authtoken, setAuthToken } = useNgrokContext();
  const [tempAuthToken, setTempAuthToken] = useState(authtoken);

  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setTempAuthToken(authtoken);
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleChange = (event: any) => {
    setTempAuthToken(event.target.value);
  };

  const handleSave = (event: any) => {
    setAuthToken(tempAuthToken);
    setOpen(false);
  };

  return (
    <div>
      <Button size="small" onClick={handleClickOpen}>
        Settings
      </Button>
      <Dialog open={open} onClose={handleCancel}>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Copy your ngrok Authtoken here to use your ngrok account.<br/>You only have to do this once.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="ngrok Authtoken"
            placeholder="2GPS8IuofEuUw..."
            type="password"
            fullWidth
            variant="filled"
            onChange={handleChange}
            value={tempAuthToken}
            style={{marginTop:"1em"}}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={tempAuthToken.length === 0}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
