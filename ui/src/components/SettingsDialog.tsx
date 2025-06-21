import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Link,
} from "@mui/material";
import Button from "@mui/material/Button";
import React, { useState } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";

import { useNgrokContext } from "./NgrokContext";

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export default function SettingsDialog() {
  const { authToken, setAuthToken } = useNgrokContext();
  const [tempAuthToken, setTempAuthToken] = useState(authToken);
  const ddClient = useDockerDesktopClient();

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

  const handleSave = (_event: any) => {
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
            Paste your Authtoken to authenticate your ngrok agent. You only have to do this once.{' '}
            <Link
              component="button"
              variant="inherit"
              onClick={() => {
                ddClient.host.openExternal(
                  "https://dashboard.ngrok.com/get-started/your-authtoken"
                );
              }}
              sx={{ textDecoration: 'underline', cursor: 'pointer' }}
            >
              Get authtoken from dashboard
            </Link>
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="ngrok Auth Token"
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
