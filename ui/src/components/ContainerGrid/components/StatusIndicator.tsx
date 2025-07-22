import { Box } from "@mui/material";

interface StatusIndicatorProps {
  isOnline: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isOnline }) => {
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: isOnline ? '#2e7f74' : '#8993a5'
      }}
    />
  );
};

export default StatusIndicator;
