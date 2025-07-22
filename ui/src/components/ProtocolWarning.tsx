import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { createDockerDesktopClient } from "@docker/extension-api-client";

const ddClient = createDockerDesktopClient();

interface ProtocolWarningProps {
  visible: boolean;
  detectedProtocol: string;
  enteredProtocol: string;
}

const ProtocolWarning: React.FC<ProtocolWarningProps> = ({
  visible,
  detectedProtocol: _detectedProtocol,
  enteredProtocol
}) => {
  if (!visible) return null;

  const handleLearnMoreClick = () => {
    ddClient.host.openExternal('https://ngrok.com/docs/protocol/');
  };

  return (
    <Box
      sx={{
        backgroundColor: '#fff4dc',
        borderRadius: 1,
        p: 2,
        mb: 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2
      }}
    >
      <WarningIcon 
        sx={{ 
          color: '#b85504', 
          width: 20, 
          height: 20,
          flexShrink: 0,
          mt: 0.2
        }} 
      />
      <Box sx={{ flex: 1 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#b85504',
            fontSize: '14px',
            lineHeight: 1.4
          }}
        >
          Are you sure you want to <Box component="span" sx={{ fontWeight: 'medium' }}>{enteredProtocol}</Box>? 
          We haven't detected this protocol on your endpoint.
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#b85504',
            fontSize: '14px',
            lineHeight: 1.4,
            mt: 0.5
          }}
        >
          <Link
            component="button"
            onClick={handleLearnMoreClick}
            sx={{
              color: '#b85504',
              fontSize: '14px',
              fontWeight: 'medium',
              textDecoration: 'underline',
              cursor: 'pointer',
              p: 0,
              border: 'none',
              background: 'none'
            }}
          >
            View protocol docs
          </Link>
          .
        </Typography>
      </Box>
    </Box>
  );
};

export default ProtocolWarning;
