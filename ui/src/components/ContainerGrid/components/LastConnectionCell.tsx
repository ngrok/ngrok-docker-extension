import { Typography } from "@mui/material";

interface LastConnectionCellProps {
  timestamp: string;
  isOnline: boolean;
}

const LastConnectionCell: React.FC<LastConnectionCellProps> = ({ isOnline }) => {
  return (
    <Typography
      variant="body2"
      sx={{
        color: isOnline ? '#000000' : '#677285',
        fontWeight: isOnline ? 400 : 300
      }}
    >
      tbd
    </Typography>
  );
};

export default LastConnectionCell;
