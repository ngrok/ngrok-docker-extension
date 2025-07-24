import { Typography } from "@mui/material";

interface LastStartedCellProps {
  timestamp: string;
  isOnline: boolean;
}

const LastStartedCell: React.FC<LastStartedCellProps> = ({ timestamp, isOnline }) => {
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return '';
    }
  };

  const displayText = formatTimestamp(timestamp);

  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: isOnline ? 500 : 400
      }}
    >
      {displayText}
    </Typography>
  );
};

export default LastStartedCell;
