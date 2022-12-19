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
import { useAuthContext } from "./AuthContext";

export default function SettingsDialog() {
  const { authToken, setAuthToken } = useAuthContext();
  const [tempAuthToken, setTempAuthToken] = useState(authToken);

  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setTempAuthToken(authToken);
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
      <Button variant="outlined" size="small" onClick={handleClickOpen}>
        Settings
      </Button>
      <Dialog open={open} onClose={handleCancel}>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Authenticate your ngrok agent. You only have to do this once.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Ngrok Auth Token"
            placeholder="2GPS8IuofEuUw..."
            type="password"
            fullWidth
            variant="standard"
            onChange={handleChange}
            value={tempAuthToken}
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
