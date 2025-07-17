import React from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import { SettingsOutlined, ArticleOutlined, CheckCircle, Schedule } from '@mui/icons-material';
import { AgentStatus } from '../services/statusService';
import { createDockerDesktopClient } from '@docker/extension-api-client';

interface AppHeaderProps {
  status: AgentStatus;
  onSettingsClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  status,
  onSettingsClick
}) => {
  const ddClient = createDockerDesktopClient();
  const latencyText = status.connectionLatency && status.connectionLatency > 0 
    ? `${Math.round(status.connectionLatency)}ms latency`
    : 'Checking latency';

  const getStatusLabel = () => {
    switch (status.status) {
      case 'online': return 'CONNECTED';
      case 'offline': return 'DISCONNECTED';
      case 'reconnecting': return 'RECONNECTING';
      case 'unknown': return 'UNKNOWN';
      default: return 'UNKNOWN';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'online': return '#2e7f74';
      case 'offline': return '#757575';
      case 'reconnecting': return '#ff9800';
      case 'unknown': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getStatusBgColor = () => {
    switch (status.status) {
      case 'online': return '#e6f5f3';
      case 'offline': return '#f5f5f5';
      case 'reconnecting': return '#fff3e0';
      case 'unknown': return '#f5f5f5';
      default: return '#f5f5f5';
    }
  };

  const statusColor = getStatusColor();
  const statusBgColor = getStatusBgColor();
  const statusLabel = getStatusLabel();
  const isConnected = status.status === 'online';

  const handleDocsClick = () => {
    ddClient.host.openExternal('https://ngrok.com/docs');
  };

  return (
    <Box
      display="flex"
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      gap={2}
      sx={{ width: '100%' }}
    >
      {/* Left section: Title and status indicators */}
      <Box display="flex" alignItems="center" gap={4}>
        {/* ngrok title */}
        <Typography
          variant="h3"
          sx={{
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 500,
            fontSize: 23,
            color: '#000000',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ngrok
        </Typography>
        
        {/* Status indicators */}
        <Box display="flex" alignItems="center" gap={2}>
          {/* Connection status chip */}
          <Chip
            icon={
              <CheckCircle 
                sx={{ 
                  color: statusColor,
                  width: 12,
                  height: 12,
                }} 
              />
            }
            label={statusLabel}
            variant="outlined"
            size="small"
            sx={{
              backgroundColor: statusBgColor,
              borderColor: `${statusColor}80`, // 50% opacity
              color: statusColor,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.15px',
              textTransform: 'uppercase',
              height: 20,
              px: 1,
              py: 0.5,
              '& .MuiChip-icon': {
                marginLeft: 0.5,
                marginRight: 0.5,
              },
              '& .MuiChip-label': {
                paddingLeft: 0.5,
                paddingRight: 0.5,
              }
            }}
          />
          
          {/* Latency display - only show when connected */}
          {isConnected && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <Schedule 
                sx={{ 
                  color: '#8993a5',
                  width: 14,
                  height: 14,
                }} 
              />
              <Typography
                sx={{
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 500,
                  fontSize: 10,
                  color: '#8993a5',
                  letterSpacing: '0.15px',
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                }}
              >
                {latencyText}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Right section: Action buttons */}
      <Box display="flex" alignItems="center">
        {/* Docs button */}
        <IconButton
          onClick={handleDocsClick}
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            }
          }}
        >
          <ArticleOutlined sx={{ width: 24, height: 24 }} />
        </IconButton>
        
        {/* Settings button */}
        <IconButton
          onClick={onSettingsClick}
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            }
          }}
        >
          <SettingsOutlined sx={{ width: 24, height: 24 }} />
        </IconButton>
      </Box>
    </Box>
  );
};
