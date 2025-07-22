import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Link,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  IconButton,
  InputAdornment,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import Button from "@mui/material/Button";
import React, { useState } from "react";
import { createDockerDesktopClient } from "@docker/extension-api-client";

import { useNgrokContext } from "./NgrokContext";

const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

interface SettingsDialogProps {
  open?: boolean;
  onClose?: () => void;
}



export default function SettingsDialog({ open: externalOpen, onClose }: SettingsDialogProps = {}) {
  const { authToken, setAuthToken, connectURL, setConnectURL, autoDisconnect, setAutoDisconnect } = useNgrokContext();
  const [tempAuthToken, setTempAuthToken] = useState(authToken);
  const [tempConnectURL, setTempConnectURL] = useState(connectURL);
  const [tempAutoDisconnect, setTempAutoDisconnect] = useState(autoDisconnect);
  const [showPassword, setShowPassword] = useState(false);
  const ddClient = useDockerDesktopClient();

  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  // Check if anything has changed
  const hasChanges = tempAuthToken !== authToken || 
                    tempConnectURL !== connectURL || 
                    tempAutoDisconnect !== autoDisconnect;

  const handleClickOpen = () => {
    setTempAuthToken(authToken);
    setTempConnectURL(connectURL);
    setTempAutoDisconnect(autoDisconnect);
    setInternalOpen(true);
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };

  const handleAuthTokenChange = (event: any) => {
    setTempAuthToken(event.target.value);
  };

  const handleConnectURLChange = (event: any) => {
    setTempConnectURL(event.target.value);
  };

  const handleAutoDisconnectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempAutoDisconnect(event.target.checked);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSave = (_event: any) => {
    // Update context state - the useEffect in NgrokContext will handle the API call
    setAuthToken(tempAuthToken);
    setConnectURL(tempConnectURL);
    setAutoDisconnect(tempAutoDisconnect);
    
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };

  return (
    <div>
      {externalOpen === undefined && (
        <Button size="small" onClick={handleClickOpen}>
          Settings
        </Button>
      )}
      <Dialog 
        open={isOpen} 
        onClose={handleCancel}
        maxWidth="md"
        PaperProps={{
          sx: {
            width: '642px',
            maxWidth: 'none',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontFamily: 'Roboto',
            fontWeight: 500,
            fontSize: '21px',
            lineHeight: '28px',
            p: 3
          }}
        >
          ngrok Settings
          <IconButton 
            onClick={handleCancel}
            sx={{ p: 0 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 0 }}>
          {/* Authtoken Section */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: 'Roboto',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '24px',
                mb: 2
              }}
            >
              ngrok Authtoken
            </Typography>
            <TextField
              autoFocus
              id="authtoken"
              placeholder="2GPS8IuofEuUw..."
              type={showPassword ? "text" : "password"}
              fullWidth
              variant="outlined"
              onChange={handleAuthTokenChange}
              value={tempAuthToken}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      tabIndex={-1}
                      disableFocusRipple
                      disableRipple
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Roboto Mono',
                  fontSize: '14px',
                  '& fieldset': {
                    borderColor: '#C9C9C9',
                    borderWidth: '1.5px',
                  },
                },
                mb: 2
              }}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'Roboto',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '21px',
                color: '#677285',
                mb: 1
              }}
            >
              Connects the extension with your ngrok account
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Link
                component="button"
                variant="inherit"
                onClick={() => {
                  ddClient.host.openExternal(
                    "https://dashboard.ngrok.com/get-started/your-authtoken"
                  );
                }}
                sx={{ 
                  textDecoration: 'underline', 
                  cursor: 'pointer',
                  color: '#086dd7',
                  fontFamily: 'Roboto',
                  fontSize: '12px',
                  lineHeight: '16px',
                  letterSpacing: '0.24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                View in dashboard
                <OpenInNewIcon sx={{ fontSize: '16px' }} />
              </Link>
            </Box>
          </Box>

          {/* Agent Connect URL Section */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: 'Roboto',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '24px',
                mb: 2
              }}
            >
              Agent Connect URL
            </Typography>
            <TextField
              id="connecturl"
              placeholder="connect.example.org:443"
              fullWidth
              variant="outlined"
              onChange={handleConnectURLChange}
              value={tempConnectURL}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'Roboto',
                  fontSize: '14px',
                  '& fieldset': {
                    borderColor: '#E1E2E6',
                    borderWidth: '1.5px',
                  },
                  '& input::placeholder': {
                    color: '#677285',
                  },
                },
                mb: 2
              }}
            />
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'Roboto',
                fontSize: '14px',
                lineHeight: '21px',
                color: '#677285',
                mb: 1
              }}
            >
              The network address used to connect to the ngrok service. Leave blank to use ngrok's default servers.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <Link
                component="button"
                variant="inherit"
                onClick={() => {
                  ddClient.host.openExternal("https://ngrok.com/docs/agent/ingress/");
                }}
                sx={{ 
                  textDecoration: 'underline', 
                  cursor: 'pointer',
                  color: '#086dd7',
                  fontFamily: 'Roboto',
                  fontSize: '12px',
                  lineHeight: '16px',
                  letterSpacing: '0.24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                Learn more in docs
                <OpenInNewIcon sx={{ fontSize: '16px' }} />
              </Link>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Link
                component="button"
                variant="inherit"
                onClick={() => {
                  ddClient.host.openExternal("https://dashboard.ngrok.com/tunnels/ingress");
                }}
                sx={{ 
                  textDecoration: 'underline', 
                  cursor: 'pointer',
                  color: '#086dd7',
                  fontFamily: 'Roboto',
                  fontSize: '12px',
                  lineHeight: '16px',
                  letterSpacing: '0.24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                View in dashboard
                <OpenInNewIcon sx={{ fontSize: '16px' }} />
              </Link>
            </Box>
          </Box>

          {/* Auto-disconnect Section */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: 'Roboto',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '24px',
                mb: 2
              }}
            >
              Auto-Disconnect
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={tempAutoDisconnect}
                  onChange={handleAutoDisconnectChange}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#116ED0',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#8BC7F5',
                    },
                  }}
                />
              }
              label={
                <Typography 
                  sx={{ 
                    fontFamily: 'Roboto',
                    fontSize: '14px',
                    color: '#116ED0'
                  }}
                >
                  Disconnect from ngrok service when all endpoints are offline
                </Typography>
              }
            />
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'Roboto',
                fontSize: '14px',
                lineHeight: '21px',
                color: '#677285',
                mt: 1
              }}
            >
              You may wish to enable this option to preserve bandwidth
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 3, gap: 1 }}>
          <Button 
            onClick={handleCancel} 
            variant="outlined"
            sx={{
              fontFamily: 'Roboto',
              fontWeight: 500,
              fontSize: '14px',
              width: '74px',
              height: '40px',
              borderColor: '#116ED0',
              color: '#116ED0',
              borderWidth: '2px',
              '&:hover': {
                borderWidth: '2px',
                borderColor: '#116ED0',
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={tempAuthToken.length === 0 || !hasChanges}
            sx={{
              fontFamily: 'Roboto',
              fontWeight: 500,
              fontSize: '14px',
              width: '74px',
              height: '40px',
              backgroundColor: '#116ED0',
              '&:hover': {
                backgroundColor: '#116ED0',
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
