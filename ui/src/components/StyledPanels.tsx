import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const CardPanel = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.brand.panelBackground,
  border: `1px solid ${theme.palette.grey[300]}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2)
}));

export const EmptyStatePanel = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 400,
  textAlign: 'center',
  backgroundColor: '#f9f9fa',
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4)
}));
