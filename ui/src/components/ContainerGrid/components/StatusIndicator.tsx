import { Box, Tooltip, useTheme } from "@mui/material";

interface StatusIndicatorProps {
  isOnline: boolean;
  hasError: boolean;
  errorMessage?: string;
  state?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isOnline, hasError, errorMessage, state }) => {
  const theme = useTheme();
  
  const getStatusColor = () => {
    if (state === 'starting') {
      return 'status.starting'; // Orange for starting (regardless of error)
    }
    if (state === 'failed') {
      return 'status.connectingError'; // Red for failed state
    }
    if (hasError) return 'status.connectingError'; // Red for errors
    if (isOnline) return 'status.online'; // Green for online
    return 'status.offline'; // Gray for offline
  };

  const statusDot = (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: getStatusColor(),
        ...(getStatusColor() === 'status.starting' && {
          boxShadow: `0 0 0 0 ${theme.palette.status.starting}`,
          animation: "pulse 1.5s infinite",
          '@keyframes pulse': {
            '0%': {
              transform: 'scale(0.95)',
              boxShadow: `0 0 0 0 ${theme.palette.status.starting}`,
            },
            '70%': {
              transform: 'scale(1)',
              boxShadow: '0 0 0 10px rgba(51, 217, 178, 0)',
            },
            '100%': {
              transform: 'scale(0.95)',
              boxShadow: '0 0 0 0 rgba(51, 217, 178, 0)',
            },
          },
        }),
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
