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
import { createDockerDesktopClient } from "@docker/extension-api-client";

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

interface Props {
  onSave(): void;
}

export default function SettingsDialog({ ...props }: Props) {
  const [authToken, setAuthToken] = useState<string>(() => {
    const token = localStorage.getItem("authToken");
    console.log("authToken:", token);
    return token || "";
  });
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleChange = (event: any) => {
    setAuthToken(event.target.value);
  };

  const handleSave = (event: any) => {
    const ddClient = useDockerDesktopClient();

    ddClient.extension.vm?.service
      ?.get(`/auth?token=${authToken}`)
      .then((result) => {
        console.log(result);
        localStorage.setItem("authToken", authToken);
      });

    setOpen(false);

    props.onSave();
  };

  return (
    <div>
      <Button
        variant="outlined"
        size="small"
        startIcon={<SettingsIcon />}
        onClick={handleClickOpen}
      >
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
            value={authToken}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={authToken.length === 0}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
