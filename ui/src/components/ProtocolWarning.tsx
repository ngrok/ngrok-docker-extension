import React from 'react';
import { Box, Typography } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

interface ProtocolWarningProps {
  visible: boolean;
  warningData: {
    severity: 'error' | 'warning' | 'info';
    primary: string;
    secondary: string;
  } | null;
  detectedProtocol: string;
  enteredProtocol: string;
}

const ProtocolWarning: React.FC<ProtocolWarningProps> = ({
  visible,
  warningData
}) => {
  if (!visible || !warningData) return null;

  // Get background color based on severity
  const getBackgroundColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#ffebee'; // Light red
      case 'warning': return '#fff4dc'; // Light orange (current)
      case 'info': return '#e3f2fd'; // Light blue
      default: return '#fff4dc';
    }
  };

  // Get text color based on severity
  const getTextColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#c62828'; // Dark red
      case 'warning': return '#b85504'; // Dark orange (current)
      case 'info': return '#1565c0'; // Dark blue
      default: return '#b85504';
    }
  };

  const backgroundColor = getBackgroundColor(warningData.severity);
  const textColor = getTextColor(warningData.severity);

  return (
    <Box
      sx={{
        backgroundColor,
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
          color: textColor, 
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
            color: textColor,
            fontSize: '14px',
            lineHeight: 1.4
          }}
        >
          {warningData.primary}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: textColor,
            fontSize: '14px',
            lineHeight: 1.4,
            mt: 0.5
          }}
        >
          {warningData.secondary}
        </Typography>
      </Box>
    </Box>
  );
};

export default ProtocolWarning;
