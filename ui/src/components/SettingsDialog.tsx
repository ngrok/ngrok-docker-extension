import {
  Dialog,
  DialogTitle,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { SectionTitleMb2, SectionBoxMb3, LinkButton, FlexRowGap05, SettingsDialogContentPanel, SettingsDialogActionsPanel, IconFont16 } from './styled';
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
  const { agentConfig, saveAgentSettings } = useNgrokContext();
  const [tempAuthToken, setTempAuthToken] = useState(agentConfig?.authToken || "");
  const [tempConnectURL, setTempConnectURL] = useState(agentConfig?.connectURL || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const ddClient = useDockerDesktopClient();

  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  // Check if anything has changed
  const hasChanges = tempAuthToken !== (agentConfig?.authToken || "") || 
                    tempConnectURL !== (agentConfig?.connectURL || "");

  const handleClickOpen = () => {
    setTempAuthToken(agentConfig?.authToken || "");
    setTempConnectURL(agentConfig?.connectURL || "");

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

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSave = async (_event: any) => {
    setIsSubmitting(true);
    try {
      // Use the saveAgentSettings function which will show toast and configure agent
      await saveAgentSettings({
        authToken: tempAuthToken,
        connectURL: tempConnectURL,
        expectedState: agentConfig?.expectedState || "offline"
      });
      
      if (onClose) {
        onClose();
      } else {
        setInternalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
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
        TransitionComponent={undefined}
        transitionDuration={0}
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
        <SettingsDialogContentPanel>
          {/* Authtoken Section */}
          <SectionBoxMb3>
            <SectionTitleMb2>
              ngrok Authtoken
            </SectionTitleMb2>
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
                  fontFamily: 'Roboto Mono, monospace',
                  fontSize: 14,
                },
                mb: 2
              }}
            />
            <Typography 
              variant="body2" 
              sx={{ 
              fontFamily: 'Roboto',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '21px',
              color: '#677285',
              mb: 1
              }}
            >
              Connects the extension with your ngrok account
            </Typography>
            <FlexRowGap05>
              <LinkButton
                onClick={() => {
                  ddClient.host.openExternal(
                    "https://dashboard.ngrok.com/get-started/your-authtoken"
                  );
                }}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View in dashboard
                <IconFont16>
                  <OpenInNewIcon />
                </IconFont16>
              </LinkButton>
            </FlexRowGap05>
          </SectionBoxMb3>

          {/* Agent Connect URL Section */}
          <SectionBoxMb3>
            <SectionTitleMb2>
              Agent Connect URL
            </SectionTitleMb2>
            <TextField
              id="connecturl"
              placeholder="connect.example.org:443"
              fullWidth
              variant="outlined"
              onChange={handleConnectURLChange}
              value={tempConnectURL}
              sx={{
                
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
              The network address used to connect to the ngrok service. Leave blank to use ngrok's default servers
            </Typography>
            <FlexRowGap05 sx={{ gap: '12px' }}>
              <LinkButton
                onClick={() => {
                  ddClient.host.openExternal("https://dashboard.ngrok.com/tunnels/ingress");
                }}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View in dashboard
                <IconFont16><OpenInNewIcon /></IconFont16>
              </LinkButton>
              <LinkButton
                onClick={() => {
                  ddClient.host.openExternal("https://ngrok.com/docs/agent/ingress/");
                }}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Learn more
                <IconFont16><OpenInNewIcon /></IconFont16>
              </LinkButton>
            </FlexRowGap05>
          </SectionBoxMb3>

        </SettingsDialogContentPanel>
        <SettingsDialogActionsPanel>
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
            disabled={tempAuthToken.length === 0 || !hasChanges || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : undefined}
            sx={{
              fontFamily: 'Roboto',
              fontWeight: 500,
              fontSize: '14px',
              width: isSubmitting ? 'auto' : '74px',
              height: '40px',
              backgroundColor: '#116ED0',
              '&:hover': {
                backgroundColor: '#116ED0',
              },
            }}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </SettingsDialogActionsPanel>
      </Dialog>
    </div>
  );
}
