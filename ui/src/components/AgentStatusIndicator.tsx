import React from 'react';
import { Chip, Tooltip, Box } from '@mui/material';
import { Circle } from '@mui/icons-material';
import { AgentStatus } from '../services/statusService';

interface AgentStatusIndicatorProps {
  status: AgentStatus;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return '#4caf50'; // green
    case 'offline': return '#757575'; // neutral gray
    case 'reconnecting': return '#ff9800'; // orange
    case 'unknown': return '#9e9e9e'; // gray
    default: return '#9e9e9e';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'online': return 'Connected';
    case 'offline': return 'Not Connected';
    case 'reconnecting': return 'Reconnecting';
    case 'unknown': return 'Unknown';
    default: return 'Unknown';
  }
};

const getTooltipContent = (status: AgentStatus) => {
  switch (status.status) {
    case 'online':
      return status.connectionLatency && status.connectionLatency > 0
        ? `Connected - Latency: ${status.connectionLatency}ms`
        : 'Connected to ngrok servers';
    case 'reconnecting':
      return status.lastError
        ? `Reconnecting - Last error: ${status.lastError}`
        : 'Reconnecting to ngrok servers';
    case 'offline':
      return 'ngrok will connect when you start an endpoint';
    case 'unknown':
      return 'Unable to determine connection status';
    default:
      return 'Connection status unknown';
  }
};

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  status
}) => {
  const statusColor = getStatusColor(status.status);
  const statusLabel = getStatusLabel(status.status);
  const tooltipContent = getTooltipContent(status);

  return (
    <Tooltip title={tooltipContent} arrow>
      <Box display="flex" alignItems="center" gap={1}>
        <Chip
          icon={<Circle sx={{ color: statusColor }} />}
          label={statusLabel}
          variant="outlined"
          size="small"
          sx={{
            borderColor: statusColor,
            color: statusColor,
            '& .MuiChip-icon': {
              color: statusColor
            }
          }}
        />
      </Box>
    </Tooltip>
  );
};
