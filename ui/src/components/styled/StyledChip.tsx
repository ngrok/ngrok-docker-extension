import { styled } from '@mui/material/styles';
import { Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface StatusChipProps {
  status: 'online' | 'offline' | 'reconnecting' | 'unknown';
}

export const StatusChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'status'
})<StatusChipProps>(({ theme, status }) => {
  const statusColor = theme.palette.status[status];
  const backgroundColor = alpha(statusColor, 0.1);
  
  return {
    height: 20,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.15px',
    textTransform: 'uppercase',
    backgroundColor,
    color: statusColor,
    borderColor: alpha(statusColor, 0.5),
    '& .MuiChip-icon': {
      color: statusColor,
      width: 12,
      height: 12,
      marginLeft: theme.spacing(0.5),
      marginRight: theme.spacing(0.5)
    },
    '& .MuiChip-label': {
      paddingLeft: theme.spacing(0.5),
      paddingRight: theme.spacing(0.5)
    }
  };
});
