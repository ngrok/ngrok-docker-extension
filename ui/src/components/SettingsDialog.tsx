import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from "@mui/material/Button";
import React, { useState } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";

import { useNgrokContext } from "./NgrokContext";

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export default function SettingsDialog() {
  const { authToken, setAuthToken, connectURL, setConnectURL } = useNgrokContext();
  const [tempAuthToken, setTempAuthToken] = useState(authToken);
  const [tempConnectURL, setTempConnectURL] = useState(connectURL);
  const ddClient = useDockerDesktopClient();

  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setTempAuthToken(authToken);
    setTempConnectURL(connectURL);
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleAuthTokenChange = (event: any) => {
    setTempAuthToken(event.target.value);
  };

  const handleConnectURLChange = (event: any) => {
    setTempConnectURL(event.target.value);
  };

  const handleUseDefault = () => {
    setTempConnectURL("");
  };

  const handleSave = (_event: any) => {
    setAuthToken(tempAuthToken);
    setConnectURL(tempConnectURL);
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
            id="authtoken"
            label="ngrok Auth Token"
            placeholder="2GPS8IuofEuUw..."
            type="password"
            fullWidth
            variant="filled"
            onChange={handleAuthTokenChange}
            value={tempAuthToken}
            style={{marginTop:"1em"}}
          />

          <Accordion style={{marginTop:"1em"}}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="advanced-settings-content"
              id="advanced-settings-header"
            >
              <Typography>Advanced Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <TextField
                    margin="dense"
                    id="connecturl"
                    label="Agent Connect URL"
                    placeholder=""
                    sx={{ flexGrow: 1 }}
                    variant="filled"
                    onChange={handleConnectURLChange}
                    value={tempConnectURL}
                  />
                  <Button 
                    size="small" 
                    onClick={handleUseDefault}
                    variant="outlined"
                    disabled={tempConnectURL === ""}
                    sx={{ mb: 1 }}
                  >
                    Use Default
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" style={{marginTop:"0.5em"}}>
                  Specify a custom agent ingress address. Leave blank to use ngrok's default servers.{' '}
                  <Link
                    component="button"
                    variant="inherit"
                    onClick={() => {
                      ddClient.host.openExternal("https://ngrok.com/docs/agent/ingress/");
                    }}
                    sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Learn more about agent ingress
                  </Link>
                  {' '}or{' '}
                  <Link
                    component="button"
                    variant="inherit"
                    onClick={() => {
                      ddClient.host.openExternal("https://dashboard.ngrok.com/tunnels/ingress");
                    }}
                    sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    manage agent ingress in dashboard
                  </Link>
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
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
