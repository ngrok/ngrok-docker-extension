import { Theme } from '@mui/material/styles';

export const getLatencyColor = (latency: number | undefined, theme: Theme): string => {
  if (!latency || latency <= 0) return theme.palette.grey[500];
  if (latency < 250) return theme.palette.success.main;
  if (latency < 750) return theme.palette.warning.main;
  return theme.palette.error.main;
};

export const getStatusColors = (status: string, theme: Theme) => {
  const statusKey = status as keyof typeof theme.palette.status;
  return {
    color: theme.palette.status[statusKey] || theme.palette.status.unknown,
    backgroundColor: `${theme.palette.status[statusKey] || theme.palette.status.unknown}1A` // 10% opacity
  };
};
