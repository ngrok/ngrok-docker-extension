import { Box, Tooltip } from "@mui/material";

interface StatusIndicatorProps {
  isOnline: boolean;
  hasError: boolean;
  errorMessage?: string;
  state?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isOnline, hasError, errorMessage, state }) => {
  const getStatusColor = () => {
    if (state === 'starting') {
      return '#ffa726'; // Orange for starting (regardless of error)
    }
    if (state === 'failed') {
      return '#d32f2f'; // Red for failed state
    }
    if (hasError) return '#d32f2f'; // Red for errors
    if (isOnline) return '#2e7f74'; // Green for online
    return '#8993a5'; // Gray for offline
  };

  const statusDot = (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: getStatusColor()
      }}
    />
  );

  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%'
      }}
    >
      {statusDot}
    </Box>
  );

  // Show tooltip for starting state
  if (state === 'starting') {
    const tooltipMessage = hasError && errorMessage ? errorMessage : "endpoint is trying to start";
    return (
      <Tooltip title={tooltipMessage} arrow>
        {content}
      </Tooltip>
    );
  }

  // Show tooltip for failed state
  if (state === 'failed') {
    const tooltipMessage = errorMessage || "endpoint failed to start";
    return (
      <Tooltip title={tooltipMessage} arrow>
        {content}
      </Tooltip>
    );
  }

  // Show tooltip with error message if there's an error
  if (hasError && errorMessage) {
    return (
      <Tooltip title={errorMessage} arrow>
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default StatusIndicator;
